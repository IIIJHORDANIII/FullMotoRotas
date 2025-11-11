# Motorotas Backend

Backend construído em Next.js (App Router) para o serviço de gerenciamento de motoboys da Motorotas. O projeto entrega uma API RESTful com autenticação via JWT, controle de acesso por papéis e recursos completos para administração de estabelecimentos, motoboys, pedidos e avaliações.

## Requisitos

- Node.js 18+
- npm (ou pnpm/yarn se preferir)

## Configuração

1. Instale dependências:
   ```bash
   npm install
   ```
2. Configure variáveis de ambiente (veja `config/env.example` e crie um arquivo `.env` com os mesmos campos):
   - `DATABASE_URL` (padrão: `file:./dev.db`)
   - `JWT_SECRET`
   - `DEFAULT_ADMIN_EMAIL`
   - `DEFAULT_ADMIN_PASSWORD`
3. Execute as migrações e gere o Prisma Client:
   ```bash
   npx prisma migrate dev
   ```

O sistema cria automaticamente um usuário administrador padrão no primeiro acesso (`DEFAULT_ADMIN_EMAIL`).

## Scripts úteis

- `npm run dev` – inicia o servidor Next.js em modo desenvolvimento.
- `npm run lint` – executa o lint.
- `npx prisma studio` – abre o Prisma Studio para inspecionar o banco.

## Principais Endpoints

| Método | Rota | Descrição | Permissões |
| ------ | ---- | --------- | ---------- |
| `POST` | `/api/auth/register` | Cadastro de usuários (estabelecimento ou motoboy) | Público |
| `POST` | `/api/auth/login` | Login com retorno de JWT | Público |
| `GET` | `/api/auth/me` | Dados do usuário autenticado | Autenticado |
| `GET/POST` | `/api/establishments` | Listagem e criação de estabelecimentos | Admin / Admin |
| `GET/PATCH` | `/api/establishments/:id` | Detalhes e atualização | Admin ou dono |
| `GET/POST` | `/api/motoboys` | Listagem e criação de motoboys | Admin, Estab. / Admin |
| `GET/PATCH` | `/api/motoboys/:id` | Detalhes e atualização | Admin, Estab., Motoboy |
| `GET/POST` | `/api/orders` | Listagem e criação de pedidos | Admin, Estab., Motoboy / Admin, Estab. |
| `GET/PATCH` | `/api/orders/:id` | Detalhes e atualização de pedido | Admin, Estab., Motoboy |
| `POST/PATCH` | `/api/orders/:id/assign` | Atribuição e atualização de vínculo com motoboy | Admin, Estab. / Motoboy |
| `POST` | `/api/orders/:id/events` | Registro de eventos de status | Admin, Estab., Motoboy |
| `GET/POST` | `/api/orders/:id/reviews` | Listagem e criação de avaliações | Admin, Estab., Motoboy |
| `GET` | `/api/tracking/:code` | Rastreamento público por código | Público |
| `GET` | `/api/reports/summary` | Relatório consolidado administrativo | Admin |

## Estrutura de Diretórios

```
src/
  app/api/...   # Handlers HTTP
  lib/...       # Utilitários (auth, prisma, env, erros)
  validation/...# Esquemas Zod
prisma/
  schema.prisma # Modelo de dados
```

## Testes rápidos com HTTPie

```bash
# Login administrador
http POST :3000/api/auth/login email=admin@motorotas.com password=Admin@123

# Criar estabelecimento (admin)
http POST :3000/api/establishments \
  "Authorization:Bearer <TOKEN>" \
  email=restaurante@example.com \
  password=Senha@123 \
  profile:='{"name":"Restaurante X","cnpj":"12345678000190",...}'
```

Consulte `docs/IMPLEMENTATION_REPORT.md` para um resumo executivo completo das funcionalidades implementadas.
