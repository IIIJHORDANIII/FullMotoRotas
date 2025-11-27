# Guia de Login e Criação de Usuários

## Problema: Erro 401 ao fazer login

Se você está recebendo erro 401 ao tentar fazer login, pode ser porque:

1. **Usuário não existe no banco de dados de produção**
   - Usuários criados localmente não são sincronizados automaticamente com produção
   - É necessário criar o usuário no banco de dados de produção

2. **Senha incorreta**
   - Verifique se está usando a senha correta

3. **Usuário inativo**
   - O usuário pode estar desativado no banco de dados

## Solução: Criar usuário em produção

### Opção 1: Usar a API de registro (recomendado)

Se você tem acesso ao sistema como admin, pode criar usuários através da API:

```bash
curl -X POST https://motorotas.app.br/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "estabelecimento@motorotas.app.br",
    "password": "Estabelecimento@123",
    "role": "ESTABLISHMENT",
    "profile": {
      "name": "Estabelecimento Motorotas",
      "cnpj": "12345678000190",
      "contactEmail": "estabelecimento@motorotas.app.br",
      "contactPhone": "(11) 98765-4321",
      "addressLine1": "Rua Exemplo, 123",
      "addressLine2": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01234-567",
      "deliveryRadiusKm": 10,
      "baseDeliveryFee": 5.0,
      "additionalPerKm": 1.5,
      "estimatedDeliveryTimeMinutes": 30,
      "plan": "BASIC",
      "isActive": true
    }
  }'
```

### Opção 2: Executar script localmente conectado ao banco de produção

1. Configure a `DATABASE_URL` no `.env` para apontar para o banco de produção
2. Execute o script de criação:

```bash
npm run create-establishment
```

### Opção 3: Criar via Vercel CLI (se tiver acesso)

1. Conecte-se ao banco de dados de produção via Vercel CLI
2. Execute o script de criação

## Usuários padrão

### Estabelecimento
- **Email:** `estabelecimento@motorotas.app.br`
- **Senha:** `Estabelecimento@123`
- **Role:** `ESTABLISHMENT`

### Motoboy
- **Email:** `motoboy@teste.com`
- **Senha:** `Motoboy@123`
- **Role:** `MOTOBOY`

### Admin
- **Email:** `admin@motorotas.com` (ou o valor de `DEFAULT_ADMIN_EMAIL`)
- **Senha:** `Admin@123` (ou o valor de `DEFAULT_ADMIN_PASSWORD`)
- **Role:** `ADMIN`

## Verificar logs de erro

Os logs do login estão disponíveis no console da Vercel. Verifique:

1. Acesse o dashboard da Vercel
2. Vá para a aba "Functions" ou "Logs"
3. Procure por logs com prefixo `[Login]`

Os logs mostrarão:
- Se o usuário foi encontrado
- Se a senha está correta
- Se há erros de conexão com o banco de dados
- Detalhes sobre qualquer erro

## Mensagens de erro melhoradas

Agora o sistema retorna mensagens mais específicas:

- **"Email ou senha incorretos"** - Usuário não encontrado ou senha incorreta
- **"Conta desativada"** - Usuário existe mas está inativo
- **"Erro ao validar credenciais"** - Erro ao comparar senha
- **"Erro ao conectar com o banco de dados"** - Problema de conexão

## Próximos passos após criar usuário

1. Faça login com as credenciais
2. Altere a senha após o primeiro login
3. Atualize os dados do estabelecimento (CNPJ, endereço, etc.)
4. Configure as preferências de entrega

