// Script para manter motoboys online enquanto roda e removê-los ao encerrar
// Usa PostgreSQL direto para evitar problemas com Prisma Data Proxy
import { Client } from "pg";
import bcrypt from "bcryptjs";
import * as readline from "readline";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";

// Carregar variáveis de ambiente do .env manualmente
try {
  const envPath = resolve(process.cwd(), ".env");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value.trim();
        }
      }
    }
  });
} catch (error) {
  console.warn("⚠️  Não foi possível carregar .env, usando variáveis de ambiente do sistema");
}

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
let finalUrl = directUrl || databaseUrl;

// Se a URL começa com prisma:// ou prisma+postgres://, precisamos usar DIRECT_DATABASE_URL
if (finalUrl.startsWith("prisma://") || finalUrl.startsWith("prisma+postgres://")) {
  if (!directUrl) {
    throw new Error(
      "DATABASE_URL é uma URL do Prisma Data Proxy. Configure DIRECT_DATABASE_URL com uma URL direta do PostgreSQL (postgresql://...)"
    );
  }
  finalUrl = directUrl;
}

console.log(`[Script] Usando URL: ${finalUrl.substring(0, Math.min(50, finalUrl.length))}...`);

// Criar cliente PostgreSQL direto
const client = new Client({
  connectionString: finalUrl,
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

// Função para calcular distância em km entre duas coordenadas
function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Função para gerar coordenadas aleatórias distribuídas pela cidade
// Garante que cada motoboy esteja a pelo menos 25km de distância dos outros
function distributedLocations(centerLat: number, centerLng: number, radius: number, count: number): Array<{ lat: number; lng: number }> {
  const locations: Array<{ lat: number; lng: number }> = [];
  
  // Converter raio para graus (aproximadamente 1 grau = 111km)
  const radiusInDegrees = radius / 111;
  
  // Distância mínima de 25km entre motoboys
  const minDistanceKm = 25;
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let location: { lat: number; lng: number } | null = null;
    const maxAttempts = 500; // Mais tentativas para garantir espaçamento de 25km
    
    while (!location && attempts < maxAttempts) {
      // Gerar coordenadas completamente aleatórias dentro do círculo
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radiusInDegrees;
      
      const latOffset = distance * Math.cos(angle);
      const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
      
      const candidateLat = centerLat + latOffset;
      const candidateLng = centerLng + lngOffset;
      
      // Verificar se está a pelo menos 5km de distância de todos os outros motoboys
      const tooClose = locations.some((existing) => {
        const distKm = distanceInKm(candidateLat, candidateLng, existing.lat, existing.lng);
        return distKm < minDistanceKm;
      });
      
      if (!tooClose) {
        location = { lat: candidateLat, lng: candidateLng };
      }
      
      attempts++;
    }
    
    // Se não encontrou após tentativas, tentar posições mais próximas da borda
    // para maximizar o espaço disponível
    if (!location) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const angle = Math.random() * 2 * Math.PI;
        // Tentar posições mais próximas da borda do círculo
        const distance = (0.7 + Math.random() * 0.3) * radiusInDegrees; // Entre 70% e 100% do raio
        
        const latOffset = distance * Math.cos(angle);
        const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
        
        const candidateLat = centerLat + latOffset;
        const candidateLng = centerLng + lngOffset;
        
        const tooClose = locations.some((existing) => {
          const distKm = distanceInKm(candidateLat, candidateLng, existing.lat, existing.lng);
          return distKm < minDistanceKm;
        });
        
        if (!tooClose) {
          location = { lat: candidateLat, lng: candidateLng };
          break;
        }
      }
    }
    
    // Se ainda não encontrou, usar posição aleatória mesmo (pode estar mais próxima)
    // Isso garante que sempre teremos uma localização
    if (!location) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radiusInDegrees;
      const latOffset = distance * Math.cos(angle);
      const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
      location = {
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset,
      };
    }
    
    locations.push(location);
  }
  
  // Embaralhar as localizações para garantir aleatoriedade na ordem
  for (let i = locations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [locations[i], locations[j]] = [locations[j], locations[i]];
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
        // Verificar se já existe usando SQL direto
        const userResult = await client.query(
          `SELECT u.id, u.email, m.id as motoboy_id 
           FROM "User" u 
           LEFT JOIN "MotoboyProfile" m ON m."userId" = u.id 
           WHERE u.email = $1`,
          [email]
        );

        if (userResult.rows.length > 0 && userResult.rows[0].motoboy_id) {
          // Atualizar localização do motoboy existente
          await client.query(
            `UPDATE "MotoboyProfile" 
             SET "currentLat" = $1, "currentLng" = $2, "isAvailable" = true 
             WHERE id = $3`,
            [location.lat, location.lng, userResult.rows[0].motoboy_id]
          );
          
          const motoboyId = userResult.rows[0].motoboy_id;
          if (!createdMotoboyIds.includes(motoboyId)) {
            createdMotoboyIds.push(motoboyId);
          }
          // Salvar localização inicial para manter distribuição
          motoboyLocations.set(motoboyId, {
            lat: location.lat,
            lng: location.lng,
            cityIndex: cityIndex,
          });
        } else {
          // Criar novo motoboy usando SQL direto
          const fullName = generateFullName();
          const passwordHash = await bcrypt.hash("Motoboy@123", 10);
          const cpf = generateCPF();
          const cnhNumber = generateCNH();
          const cnhCategory = CNH_CATEGORIES[Math.floor(Math.random() * CNH_CATEGORIES.length)];
          const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
          const phone = generatePhone();

          // Gerar IDs únicos
          const userId = randomUUID();
          const motoboyId = randomUUID();

          // Criar usuário primeiro
          await client.query(
            `INSERT INTO "User" (id, email, password, role, "isActive", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 'MOTOBOY', true, NOW(), NOW())`,
            [userId, email, passwordHash]
          );

          // Criar perfil de motoboy
          await client.query(
            `INSERT INTO "MotoboyProfile" 
             (id, "userId", "fullName", cpf, "cnhNumber", "cnhCategory", "vehicleType", phone, 
              "isAvailable", "currentLat", "currentLng", "hiredAt", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, NOW(), NOW(), NOW())`,
            [motoboyId, userId, fullName, cpf, cnhNumber, cnhCategory, vehicleType, phone, location.lat, location.lng]
          );

          createdMotoboyIds.push(motoboyId);
          // Salvar localização inicial para manter distribuição
          motoboyLocations.set(motoboyId, {
            lat: location.lat,
            lng: location.lng,
            cityIndex: cityIndex,
          });
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
        const motoboyResult = await client.query(
          `SELECT "currentLat", "currentLng" FROM "MotoboyProfile" WHERE id = $1`,
          [motoboyId]
        );
        
        if (motoboyResult.rows.length > 0 && motoboyResult.rows[0].currentLat && motoboyResult.rows[0].currentLng) {
          const motoboy = motoboyResult.rows[0];
          // Encontrar cidade correspondente
          const cityIndex = CITIES.findIndex((c) => {
            const latDiff = Math.abs(motoboy.currentLat - c.centerLat);
            const lngDiff = Math.abs(motoboy.currentLng - c.centerLng);
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
      
      await client.query(
        `UPDATE "MotoboyProfile" 
         SET "currentLat" = $1, "currentLng" = $2, "isAvailable" = true 
         WHERE id = $3`,
        [savedLocation.lat + latOffset, savedLocation.lng + lngOffset, motoboyId]
      );
    } catch (error) {
      console.error(`Erro ao atualizar motoboy ${motoboyId}:`, error);
    }
  }
}

async function cleanupMotoboys() {
  console.log("\n🧹 Limpando localizações dos motoboys...");
  
  for (const motoboyId of createdMotoboyIds) {
    try {
      await client.query(
        `UPDATE "MotoboyProfile" 
         SET "currentLat" = NULL, "currentLng" = NULL, "isAvailable" = false 
         WHERE id = $1`,
        [motoboyId]
      );
    } catch (error) {
      console.error(`Erro ao limpar motoboy ${motoboyId}:`, error);
    }
  }
  
  console.log(`✅ ${createdMotoboyIds.length} motoboys limpos`);
}

async function main() {
  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log("✅ Conectado ao banco de dados\n");

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
      await client.end();
      rl.close();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Manter o script rodando
    console.log("\n⏳ Script rodando... Pressione Ctrl+C para encerrar\n");
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    await cleanupMotoboys();
    await client.end();
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error("❌ Erro fatal:", error);
  await cleanupMotoboys();
  await client.end();
  process.exit(1);
});

