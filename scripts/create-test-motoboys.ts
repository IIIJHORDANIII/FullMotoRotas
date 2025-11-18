// Importar do @prisma/client padrão
// IMPORTANTE: O Prisma Client deve ser regenerado sem Data Proxy antes de executar este script
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Para scripts locais, precisamos usar uma URL direta do PostgreSQL
const directUrl = process.env.DIRECT_DATABASE_URL;
const databaseUrl = process.env.DATABASE_URL;

if (!directUrl && !databaseUrl) {
  throw new Error(
    "DIRECT_DATABASE_URL ou DATABASE_URL não está definida. Configure a string de conexão do banco de dados.\n" +
    "Para scripts locais, use DIRECT_DATABASE_URL com uma URL direta do PostgreSQL (postgresql://...)"
  );
}

// Usar DIRECT_DATABASE_URL se disponível (conexão direta), senão DATABASE_URL
const finalUrl = directUrl || databaseUrl;

// CRÍTICO: Definir a URL ANTES de importar/criar o Prisma Client
// O Prisma Client lê DATABASE_URL no momento da importação
process.env.DATABASE_URL = finalUrl;

// Garantir que Data Proxy está desabilitado
process.env.PRISMA_CLIENT_USE_DATAPROXY = "false";
delete process.env.PRISMA_GENERATE_DATAPROXY;
delete process.env.PRISMA_CLIENT_DATAPROXY;

console.log(`[Script] Usando URL: ${finalUrl.substring(0, Math.min(50, finalUrl.length))}...`);
console.log(`[Script] Data Proxy desabilitado: ${process.env.PRISMA_CLIENT_USE_DATAPROXY}`);

// Criar Prisma Client - ele usará DATABASE_URL da variável de ambiente
// IMPORTANTE: O cliente deve ter sido regenerado sem Data Proxy
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: finalUrl,
    },
  },
});

// Coordenadas centrais das cidades
const CITIES = [
  {
    name: "Joinville",
    centerLat: -26.3044,
    centerLng: -48.8456,
    radius: 0.15, // Raio aproximado em graus (~15km)
  },
  {
    name: "Jaraguá do Sul",
    centerLat: -26.4853,
    centerLng: -49.0664,
    radius: 0.1, // Raio aproximado em graus (~10km)
  },
  {
    name: "Florianópolis",
    centerLat: -27.5954,
    centerLng: -48.5480,
    radius: 0.2, // Raio aproximado em graus (~20km)
  },
];

// Nomes brasileiros para gerar dados realistas
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

// Função para gerar um número aleatório entre min e max
function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Função para gerar coordenadas distribuídas uniformemente dentro de um raio
// Usa distribuição espacial para evitar pontos muito próximos
function generateDistributedLocations(
  centerLat: number,
  centerLng: number,
  radius: number,
  count: number
): { lat: number; lng: number }[] {
  const locations: { lat: number; lng: number }[] = [];
  const minDistance = radius / Math.sqrt(count); // Distância mínima entre pontos
  
  // Converter raio para graus (aproximadamente 1 grau = 111km)
  const radiusInDegrees = radius / 111;
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let location: { lat: number; lng: number } | null = null;
    const maxAttempts = 50; // Limite de tentativas para evitar loop infinito
    
    while (!location && attempts < maxAttempts) {
      // Gerar um ângulo e distância
      const angle = Math.random() * 2 * Math.PI;
      // Usar distribuição mais uniforme (raiz quadrada para distribuir melhor)
      const distance = Math.sqrt(Math.random()) * radiusInDegrees;
      
      const latOffset = distance * Math.cos(angle);
      const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
      
      const candidateLat = centerLat + latOffset;
      const candidateLng = centerLng + lngOffset;
      
      // Verificar se está longe o suficiente dos outros pontos
      const tooClose = locations.some((existing) => {
        const latDiff = candidateLat - existing.lat;
        const lngDiff = candidateLng - existing.lng;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        return distance < minDistance;
      });
      
      if (!tooClose) {
        location = { lat: candidateLat, lng: candidateLng };
      }
      
      attempts++;
    }
    
    // Se não encontrou posição ideal após tentativas, usar posição aleatória mesmo
    if (!location) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.sqrt(Math.random()) * radiusInDegrees;
      const latOffset = distance * Math.cos(angle);
      const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
      location = {
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset,
      };
    }
    
    locations.push(location);
  }
  
  return locations;
}

// Função para gerar coordenadas aleatórias dentro de um raio (mantida para compatibilidade)
function randomLocation(centerLat: number, centerLng: number, radius: number): { lat: number; lng: number } {
  // Gerar um ângulo aleatório e uma distância aleatória dentro do raio
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * radius; // Usar raiz quadrada para distribuição mais uniforme
  
  // Converter distância em graus (aproximadamente 1 grau = 111km)
  const latOffset = (distance * Math.cos(angle)) / 111;
  const lngOffset = (distance * Math.sin(angle)) / (111 * Math.cos(centerLat * Math.PI / 180));
  
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}

// Função para gerar CPF aleatório (apenas para teste)
function generateCPF(): string {
  const digits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10));
  return digits.join("");
}

// Função para gerar CNH aleatória
function generateCNH(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
}

// Função para gerar telefone aleatório
function generatePhone(): string {
  const areaCode = ["47", "48", "49"]; // Códigos de área de SC
  const prefix = Math.floor(Math.random() * 9000) + 1000;
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode[Math.floor(Math.random() * areaCode.length)]}) ${prefix}-${suffix}`;
}

// Função para gerar nome completo
function generateFullName(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName1 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const lastName2 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName1} ${lastName2}`;
}

async function createTestMotoboys() {
  console.log("\n🔧 Criando 50 motoboys de teste...\n");

  const TOTAL_MOTOBOYS = 50;
  const motoboysPerCity = Math.floor(TOTAL_MOTOBOYS / CITIES.length);
  const remainder = TOTAL_MOTOBOYS % CITIES.length;

  let createdCount = 0;
  let skippedCount = 0;

  try {
    for (let cityIndex = 0; cityIndex < CITIES.length; cityIndex++) {
      const city = CITIES[cityIndex];
      const count = motoboysPerCity + (cityIndex < remainder ? 1 : 0);

      console.log(`\n📍 Criando ${count} motoboys em ${city.name}...`);

      // Gerar localizações distribuídas uniformemente para esta cidade
      const locations = generateDistributedLocations(city.centerLat, city.centerLng, city.radius, count);

      for (let i = 0; i < count; i++) {
        const fullName = generateFullName();
        const email = `motoboy.${city.name.toLowerCase().replace(/\s+/g, "")}.${i + 1}@teste.com`;
        const password = "Motoboy@123";
        const cpf = generateCPF();
        const cnhNumber = generateCNH();
        const cnhCategory = CNH_CATEGORIES[Math.floor(Math.random() * CNH_CATEGORIES.length)];
        const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
        const phone = generatePhone();
        const location = locations[i]; // Usar localização pré-distribuída

        // Verificar se já existe
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          console.log(`   ⚠️  Já existe: ${email}`);
          skippedCount++;
          continue;
        }

        // Verificar se CPF já existe
        const existingCPF = await prisma.motoboyProfile.findUnique({
          where: { cpf },
        });

        if (existingCPF) {
          // Tentar novamente com outro CPF
          const newCPF = generateCPF();
          const finalCPF = await prisma.motoboyProfile.findUnique({
            where: { cpf: newCPF },
          }).then(() => generateCPF()).catch(() => newCPF);
          
          // Criar usuário e perfil
          const passwordHash = await bcrypt.hash(password, 10);

          await prisma.user.create({
            data: {
              email,
              password: passwordHash,
              role: Role.MOTOBOY,
              isActive: true,
              motoboy: {
                create: {
                  fullName,
                  cpf: finalCPF,
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
          });

          console.log(`   ✅ ${fullName} - ${email}`);
          createdCount++;
        } else {
          // Criar usuário e perfil
          const passwordHash = await bcrypt.hash(password, 10);

          await prisma.user.create({
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
          });

          console.log(`   ✅ ${fullName} - ${email}`);
          createdCount++;
        }
      }
    }

    // Resumo final
    console.log("\n" + "=".repeat(60));
    console.log("📋 RESUMO DA CRIAÇÃO DE MOTOBOYS");
    console.log("=".repeat(60));
    console.log(`\n✅ Criados: ${createdCount} motoboys`);
    console.log(`⚠️  Ignorados (já existiam): ${skippedCount} motoboys`);
    console.log(`\n📍 Distribuição:`);
    
    let startIndex = 0;
    for (let cityIndex = 0; cityIndex < CITIES.length; cityIndex++) {
      const city = CITIES[cityIndex];
      const count = motoboysPerCity + (cityIndex < remainder ? 1 : 0);
      console.log(`   ${city.name}: ${count} motoboys`);
      startIndex += count;
    }
    
    console.log(`\n🔐 Credenciais padrão para todos:`);
    console.log(`   Senha: Motoboy@123`);
    console.log(`\n📧 Formato de email:`);
    console.log(`   motoboy.{cidade}.{numero}@teste.com`);
    console.log(`   Exemplo: motoboy.joinville.1@teste.com`);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ Erro ao criar motoboys de teste:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMotoboys().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});

