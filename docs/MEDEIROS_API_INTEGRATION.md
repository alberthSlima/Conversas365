# Integração com API da Medeiros Distribuidora

## Arquitetura

A integração com a API da Medeiros usa o **ApiClient** já existente no projeto. As rotas Next.js instanciam o cliente com `EXTERNAL_API_BASE_URL` e fazem as requisições por um único ponto.

## Estrutura de Arquivos

```
src/
├── infrastructure/
│   └── http/
│       └── ApiClient.ts              # Cliente HTTP (já existente)
└── app/
    └── api/
        └── medeiros/
            └── products/
                └── route.ts          # Rota Next.js para buscar produtos
```

## Componentes

### 1. ApiClient
Cliente HTTP genérico com métodos `get()` e `post()`. Usado pelas rotas com a base URL da API externa.

### 2. Rota API Next.js
**Endpoint:** `GET /api/medeiros/products?branch={branch}`

**Parâmetros:**
- `branch` (query): Código da filial (padrão: "1")

**Resposta:**
```json
[
  {
    "codProd": 14805,
    "branchCode": "1",
    "description": "ABOBORA CUBOS GRANO PCT 2 KG",
    "ecommerceName": "ABÓBORA CUBOS GRANO PACOTE 2 KG",
    "packaging": "CX 5X2 KG",
    "price": 37.19,
    "section": "VEGETAIS CONGELADOS",
    "department": "CONGELADO TRANSFORMADO",
    "unit": "PT",
    "stock": 9,
    "url": "https://www.medeiros365.com.br/abobora-cubos-grano-pacote-2-kg-14805-1",
    "externalUpdatedAt": "2025-07-25T10:16:29",
    "externalCreatedAt": "2025-03-26T00:00:00"
  }
]
```

## Vantagens desta Abordagem

✅ **Centralização:** Todas as chamadas à API externa passam pelo ApiClient
✅ **Segurança:** Credenciais ficam no servidor (não expostas ao client)
✅ **Manutenibilidade:** Uma única classe de cliente para todas as APIs externas
✅ **Reutilização:** Fácil adicionar novas rotas que usam o mesmo ApiClient
✅ **Testabilidade:** Fácil criar mocks para testes

## Como Adicionar Novos Endpoints

1. Crie uma nova rota em `src/app/api/medeiros/` (ou outra pasta) e use o ApiClient:

```typescript
import { ApiClient } from '@/infrastructure/http/ApiClient';

const client = new ApiClient(process.env.EXTERNAL_API_BASE_URL || '');
const data = await client.get<SeuTipo>(`/api/v2/seu-endpoint?param=valor`);
```

2. Use nos componentes:
```typescript
const res = await fetch('/api/medeiros/products');
const products = await res.json();
```

## Variáveis de Ambiente Necessárias

```env
EXTERNAL_API_BASE_URL=https://crm.medeirosdistribuidora.com.br
EXTERNAL_API_USERNAME=ti
EXTERNAL_API_PASSWORD=ti@2025
```

## Exemplo de Uso

### No Componente:
```typescript
// ✅ CORRETO - Usando rota API interna
const res = await fetch('/api/medeiros/products?branch=1');
const products = await res.json();

// ❌ INCORRETO - Chamada direta à API externa
const res = await fetch('https://crm.medeirosdistribuidora.com.br/api/v2/offers/products?branch=1');
```

### No Servidor (API Routes):
```typescript
import { ApiClient } from '@/infrastructure/http/ApiClient';

const client = new ApiClient(process.env.EXTERNAL_API_BASE_URL || '');
const products = await client.get<unknown[]>(`/api/v2/offers/products?branch=1`);
```
