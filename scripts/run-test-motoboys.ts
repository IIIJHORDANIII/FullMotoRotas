// Script para manter motoboys online enquanto roda e removê-los ao encerrar
import { Role } from "@/generated/prisma/enums";
import bcrypt from "bcryptjs";
import * as readline from "readline";

// Importar PrismaClient diretamente do gerado e configurar com a URL correta
import { PrismaClient } from "@/generated/prisma";

// Usar DATABASE_URL (Data Proxy) do .env - o cliente gerado espera essa URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não está definida no .env");
}

console.log(`[Script] Usando DATABASE_URL (Data Proxy): ${databaseUrl.substring(0, Math.min(50, databaseUrl.length))}...`);

// Criar cliente Prisma com a URL do Data Proxy
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// IDs dos motoboys criados (para limpar ao encerrar)
const createdMotoboyIds: string[] = [];

// Armazenar localizações iniciais dos motoboys para manter distribuição espalhada
const motoboyLocations = new Map<string, { lat: number; lng: number; cityIndex: number }>();

// Coordenadas centrais das cidades
const CITIES = [
  {
    name: "Joinville",
    centerLat: -26.3044,
    centerLng: -48.8456,
    radius: 0.15,
  },
  {
    name: "Jaraguá do Sul",
    centerLat: -26.4853,
    centerLng: -49.0664,
    radius: 0.1,
  },
  {
    name: "Florianópolis",
    centerLat: -27.5954,
    centerLng: -48.5480,
    radius: 0.2,
  },
];

const FIRST_NAMES = [
  "João", "Maria", "José", "Ana", "Carlos", "Fernanda", "Paulo", "Juliana",
  "Pedro", "Mariana", "Lucas", "Camila", "Rafael", "Beatriz", "Gabriel", "Amanda",
  "Thiago", "Larissa", "Bruno", "Patricia", "Felipe", "Vanessa", "Rodrigo", "Renata",
  "Marcos", "Cristina", "André", "Daniela", "Ricardo", "Fernanda", "Eduardo", "Priscila",
  "Gustavo", "Tatiana", "Diego", "Monica", "Leonardo", "Adriana", "Vinicius", "Roberta",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Rodrigues", "Almeida",
  "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes", "Martins", "Rocha",
  "Ribeiro", "Alves", "Monteiro", "Mendes", "Barros", "Freitas", "Barbosa", "Pinto",
  "Moura", "Cavalcanti", "Dias", "Castro", "Campos", "Cardoso", "Teixeira", "Machado",
];

const VEHICLE_TYPES = ["moto", "bike", "carro"];
const CNH_CATEGORIES = ["A", "AB", "B"];

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Função para gerar localização aleatória dentro de um raio
function randomLocation(centerLat: number, centerLng: number, radius: number): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radius;
  const latOffset = (distance * Math.cos(angle)) / 111;
  const lngOffset = (distance * Math.sin(angle)) / (111 * Math.cos(centerLat * Math.PI / 180));
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}

// Função para distribuir motoboys de forma mais uniforme usando uma grade
function distributedLocations(centerLat: number, centerLng: number, radius: number, count: number): Array<{ lat: number; lng: number }> {
  const locations: Array<{ lat: number; lng: number }> = [];
  
  // Calcular número de linhas e colunas para criar uma grade
  const gridSize = Math.ceil(Math.sqrt(count));
  const stepLat = (radius * 2) / gridSize / 111; // Converter para graus
  const stepLng = (radius * 2) / gridSize / (111 * Math.cos(centerLat * Math.PI / 180));
  
  // Criar pontos em uma grade
  const startLat = centerLat - radius / 111;
  const startLng = centerLng - radius / (111 * Math.cos(centerLat * Math.PI / 180));
  
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    // Adicionar pequena variação aleatória para não ficar muito uniforme
    const randomOffsetLat = (Math.random() - 0.5) * stepLat * 0.3;
    const randomOffsetLng = (Math.random() - 0.5) * stepLng * 0.3;
    
    locations.push({
      lat: startLat + (row * stepLat) + randomOffsetLat,
      lng: startLng + (col * stepLng) + randomOffsetLng,
    });
  }
  
  return locations;
}

function generateCPF(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
}

function generateCNH(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
}

function generatePhone(): string {
  const areaCode = ["47", "48", "49"];
  const prefix = Math.floor(Math.random() * 9000) + 1000;
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode[Math.floor(Math.random() * areaCode.length)]}) ${prefix}-${suffix}`;
}

function generateFullName(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName1 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const lastName2 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName1} ${lastName2}`;
}

async function createOrUpdateMotoboys() {
  const TOTAL_MOTOBOYS = 50;
  const motoboysPerCity = Math.floor(TOTAL_MOTOBOYS / CITIES.length);
  const remainder = TOTAL_MOTOBOYS % CITIES.length;

  for (let cityIndex = 0; cityIndex < CITIES.length; cityIndex++) {
    const city = CITIES[cityIndex];
    const count = motoboysPerCity + (cityIndex < remainder ? 1 : 0);

    // Gerar localizações distribuídas uniformemente para esta cidade
    const locations = distributedLocations(city.centerLat, city.centerLng, city.radius, count);

    for (let i = 0; i < count; i++) {
      const email = `motoboy.test.${city.name.toLowerCase().replace(/\s+/g, "")}.${i + 1}@teste.com`;
      const location = locations[i];

      try {
        // Verificar se já existe
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { motoboy: true },
        });

        if (existingUser && existingUser.motoboy) {
          // Atualizar localização do motoboy existente
          await prisma.motoboyProfile.update({
            where: { id: existingUser.motoboy.id },
            data: {
              currentLat: location.lat,
              currentLng: location.lng,
              isAvailable: true,
            },
          });
          if (!createdMotoboyIds.includes(existingUser.motoboy.id)) {
            createdMotoboyIds.push(existingUser.motoboy.id);
          }
          // Salvar localização inicial para manter distribuição
          motoboyLocations.set(existingUser.motoboy.id, {
            lat: location.lat,
            lng: location.lng,
            cityIndex: cityIndex,
          });
        } else {
          // Criar novo motoboy
          const fullName = generateFullName();
          const passwordHash = await bcrypt.hash("Motoboy@123", 10);
          const cpf = generateCPF();
          const cnhNumber = generateCNH();
          const cnhCategory = CNH_CATEGORIES[Math.floor(Math.random() * CNH_CATEGORIES.length)];
          const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
          const phone = generatePhone();

          const user = await prisma.user.create({
            data: {
              email,
              password: passwordHash,
              role: Role.MOTOBOY,
              isActive: true,
              motoboy: {
                create: {
                  fullName,
                  cpf,
                  cnhNumber,
                  cnhCategory,
                  vehicleType,
                  phone,
                  isAvailable: true,
                  currentLat: location.lat,
                  currentLng: location.lng,
                  hiredAt: new Date(),
                },
              },
            },
            include: { motoboy: true },
          });

          if (user.motoboy) {
            createdMotoboyIds.push(user.motoboy.id);
            // Salvar localização inicial para manter distribuição
            motoboyLocations.set(user.motoboy.id, {
              lat: location.lat,
              lng: location.lng,
              cityIndex: cityIndex,
            });
          }
        }
      } catch (error) {
        console.error(`Erro ao criar/atualizar motoboy ${email}:`, error);
      }
    }
  }
}

async function updateMotoboyLocations() {
  for (const motoboyId of createdMotoboyIds) {
    try {
      const savedLocation = motoboyLocations.get(motoboyId);
      
      if (!savedLocation) {
        // Se não temos localização salva, buscar do banco e salvar
        const motoboy = await prisma.motoboyProfile.findUnique({
          where: { id: motoboyId },
        });
        
        if (motoboy && motoboy.currentLat && motoboy.currentLng) {
          // Encontrar cidade correspondente
          const cityIndex = CITIES.findIndex((c) => {
            const latDiff = Math.abs(motoboy.currentLat! - c.centerLat);
            const lngDiff = Math.abs(motoboy.currentLng! - c.centerLng);
            return latDiff < 0.5 && lngDiff < 0.5;
          });
          
          motoboyLocations.set(motoboyId, {
            lat: motoboy.currentLat,
            lng: motoboy.currentLng,
            cityIndex: cityIndex >= 0 ? cityIndex : 0,
          });
        }
        continue;
      }

      // Atualizar localização com pequena variação em torno da posição inicial
      // Isso mantém os motoboys espalhados mas com movimento realista (~500m de variação)
      const variation = 0.005; // ~500m de variação
      const latOffset = (Math.random() - 0.5) * variation;
      const lngOffset = (Math.random() - 0.5) * variation;
      
      await prisma.motoboyProfile.update({
        where: { id: motoboyId },
        data: {
          currentLat: savedLocation.lat + latOffset,
          currentLng: savedLocation.lng + lngOffset,
          isAvailable: true,
        },
      });
    } catch (error) {
      console.error(`Erro ao atualizar motoboy ${motoboyId}:`, error);
    }
  }
}

async function cleanupMotoboys() {
  console.log("\n🧹 Limpando localizações dos motoboys...");
  
  for (const motoboyId of createdMotoboyIds) {
    try {
      await prisma.motoboyProfile.update({
        where: { id: motoboyId },
        data: {
          currentLat: null,
          currentLng: null,
          isAvailable: false,
        },
      });
    } catch (error) {
      console.error(`Erro ao limpar motoboy ${motoboyId}:`, error);
    }
  }
  
  console.log(`✅ ${createdMotoboyIds.length} motoboys limpos`);
}

async function main() {
  console.log("\n🚀 Iniciando script de motoboys de teste...");
  console.log("📌 Os motoboys aparecerão no mapa enquanto o script estiver rodando");
  console.log("🛑 Pressione Ctrl+C para encerrar e remover os motoboys\n");

  // Criar/atualizar motoboys inicialmente
  await createOrUpdateMotoboys();
  console.log(`✅ ${createdMotoboyIds.length} motoboys criados/atualizados`);

  // Atualizar localizações a cada 15 segundos
  const updateInterval = setInterval(async () => {
    await updateMotoboyLocations();
    console.log(`📍 Localizações atualizadas (${new Date().toLocaleTimeString()})`);
  }, 15000);

  // Handler para encerramento gracioso
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const cleanup = async () => {
    clearInterval(updateInterval);
    await cleanupMotoboys();
    // Não desconectar se estiver usando o singleton do prisma
    // await prisma.$disconnect();
    rl.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Manter o script rodando
  console.log("\n⏳ Script rodando... Pressione Ctrl+C para encerrar\n");
}

main().catch(async (error) => {
  console.error("❌ Erro fatal:", error);
  await cleanupMotoboys();
  // Não desconectar se estiver usando o singleton do prisma
  // await prisma.$disconnect();
  process.exit(1);
});

