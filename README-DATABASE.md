# Configuração do Banco de Dados

## Problema com Prisma Accelerate

O Prisma Accelerate está tentando baixar binários do query-engine no servidor e falhando. Para resolver isso em desenvolvimento local, use uma conexão direta ao banco de dados.

## Configuração Recomendada

### Para Desenvolvimento Local

Adicione no seu `.env`:

```bash
# URL direta do banco de dados (OBRIGATÓRIA para desenvolvimento local)
# Use a URL direta do seu banco PostgreSQL (Neon, Supabase, etc.)
DIRECT_DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST/DATABASE?sslmode=require"

# URL do Accelerate (usada apenas em produção)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=xxxx"
```

### Para Produção (Vercel)

Configure apenas:

```bash
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=xxxx"
```

## Como Obter a DIRECT_DATABASE_URL

1. **Neon**: Vá em Settings > Connection String > Copy connection string
2. **Supabase**: Vá em Settings > Database > Connection string > URI
3. **Outros**: Use a URL de conexão direta do seu provedor PostgreSQL

## Por que usar DIRECT_DATABASE_URL em desenvolvimento?

- Evita problemas com Accelerate tentando baixar binários
- Conexão mais rápida e confiável em desenvolvimento
- Facilita debugging e desenvolvimento local
- Em produção, o Accelerate funciona normalmente

## Nota Importante

O código está configurado para usar `DIRECT_DATABASE_URL` automaticamente em desenvolvimento (`NODE_ENV=development`) se estiver disponível. Caso contrário, usa `DATABASE_URL` (Accelerate).

