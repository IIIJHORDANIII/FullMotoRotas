#!/usr/bin/env tsx
/**
 * Script para criar os planos básicos no Pagar.me
 * Execute: npx tsx scripts/create-pagarme-plans.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getPagarmeClient } from "../src/lib/pagarme";

// Carregar variáveis de ambiente do arquivo .env manualmente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env");

try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn("⚠️  Não foi possível carregar o arquivo .env:", error);
}

async function createPlans() {
  console.log("🔄 Criando planos no Pagar.me...\n");

  const client = getPagarmeClient();

  const plans = [
    {
      name: "Plano Básico",
      amount: 9900, // R$ 99,00 em centavos
      days: 30,
      payment_methods: ["credit_card", "boleto"],
      trial_days: 7,
    },
    {
      name: "Plano Profissional",
      amount: 19900, // R$ 199,00 em centavos
      days: 30,
      payment_methods: ["credit_card", "boleto"],
      trial_days: 7,
    },
  ];

  for (const planData of plans) {
    try {
      console.log(`📦 Criando plano: ${planData.name}...`);
      const plan = await client.createPlan(planData);
      console.log(`✅ Plano criado com sucesso!`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   Nome: ${plan.name}`);
      console.log(`   Valor: R$ ${(plan.amount / 100).toFixed(2)}\n`);
    } catch (error) {
      console.error(`❌ Erro ao criar plano ${planData.name}:`, error);
      if (error instanceof Error) {
        console.error(`   Mensagem: ${error.message}`);
      }
    }
  }

  console.log("\n📋 Listando todos os planos...\n");
  try {
    const allPlans = await client.listPlans();
    console.log(`✅ Total de planos: ${allPlans.length}\n`);
    allPlans.forEach((plan) => {
      console.log(`- ${plan.name} (ID: ${plan.id}) - R$ ${(plan.amount / 100).toFixed(2)}`);
    });
  } catch (error) {
    console.error("❌ Erro ao listar planos:", error);
  }
}

createPlans().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});

