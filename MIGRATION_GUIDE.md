# 🚀 Guia de Migração - Clean Architecture

Este guia mostra como migrar componentes para a nova arquitetura.

---

## ✅ O que já foi refatorado

- ✅ **Página de Templates** (`src/app/templates/page.tsx`)
- ✅ **Domain Layer** completa (Entities, Value Objects, Repository Interfaces)
- ✅ **Application Layer** completa (Use Cases, Hooks)
- ✅ **Infrastructure Layer** completa (Repositories, ApiClient)

---

## 🔄 Como Migrar Componentes

### Passo 1: Identifique a lógica de negócio

**Antes (código antigo):**
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch('/api/endpoint');
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);
```

### Passo 2: Crie o Use Case (se necessário)

Se ainda não existe um Use Case para essa funcionalidade, crie um:

```typescript
// src/application/use-cases/GetDataUseCase.ts
import { IDataRepository } from '@/domain/repositories/IDataRepository';

export class GetDataUseCase {
  constructor(private repository: IDataRepository) {}

  async execute(): Promise<Data[]> {
    return this.repository.findAll();
  }
}
```

### Passo 3: Crie um Hook customizado

```typescript
// src/application/hooks/useData.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Data } from '@/domain/entities/Data';
import { DataRepository } from '@/infrastructure/repositories/DataRepository';
import { GetDataUseCase } from '@/application/use-cases/GetDataUseCase';

export function useData() {
  const [data, setData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new DataRepository(), []);
  const getDataUseCase = useMemo(
    () => new GetDataUseCase(repository),
    [repository]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getDataUseCase.execute();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [getDataUseCase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    reload: loadData,
  };
}
```

### Passo 4: Use o Hook no componente

**Depois (código refatorado):**
```typescript
import { useData } from '@/application/hooks/useData';

export default function MyComponent() {
  const { data, loading, error, reload } = useData();

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  return (
    <div>
      {data.map(item => (
        <div key={item.getId().getValue()}>
          {item.toPrimitives().name}
        </div>
      ))}
      <button onClick={reload}>Recarregar</button>
    </div>
  );
}
```

---

## 📋 Checklist de Migração

Para cada componente que você migrar, certifique-se de:

- [ ] **Entity criada** (se necessário) em `src/domain/entities/`
- [ ] **Value Objects criados** (se necessário) em `src/domain/value-objects/`
- [ ] **Repository Interface** definida em `src/domain/repositories/`
- [ ] **Repository Implementation** criada em `src/infrastructure/repositories/`
- [ ] **Use Case criado** em `src/application/use-cases/`
- [ ] **Hook customizado criado** em `src/application/hooks/`
- [ ] **Componente refatorado** para usar o hook
- [ ] **Código compila sem erros** (`npm run build`)
- [ ] **Funcionalidade testada** no navegador

---

## 🎯 Componentes Prioritários para Migração

### 1. Template Detail Page (`src/app/templates/[id]/page.tsx`)

**Hook necessário:**
```typescript
// src/application/hooks/useTemplate.ts (JÁ CRIADO ✅)
import { useTemplate } from '@/application/hooks/useTemplate';

const { template, loading, error } = useTemplate(templateId);
```

**Migração:**
```typescript
// Antes
const [template, setTemplate] = useState(null);
useEffect(() => {
  fetch(`/api/whatsapp/templates/${id}`)...
}, [id]);

// Depois
import { useTemplate } from '@/application/hooks/useTemplate';
const { template, loading, error } = useTemplate(id);

// Converter para primitivos para UI existente
const templatePrimitive = template?.toPrimitives();
```

### 2. ConversationsChat Component (`src/components/ConversationsChat.tsx`)

**Hook necessário:**
```typescript
// src/application/hooks/useMessages.ts (JÁ CRIADO ✅)
import { useMessages } from '@/application/hooks/useMessages';

const { messages, loading, error, reload } = useMessages(phone);
```

**Migração:**
```typescript
// Antes
const [rows, setRows] = useState<Row[]>([]);
useEffect(() => {
  fetch(`/api/conversations?phone=${phone}`)...
}, [phone]);

// Depois
import { useMessages } from '@/application/hooks/useMessages';
const { messages, loading, error } = useMessages(phone);

// Converter para formato Row para manter compatibilidade
const rows = messages.map(m => ({
  id: m.getId(),
  state: m.getState(),
  initiatedBy: m.getInitiatedBy(),
  context: m.getContext(),
  createdAt: m.getCreatedAt().toISOString(),
  updatedAt: m.getUpdatedAt()?.toISOString(),
}));
```

---

## ⚠️ Problemas Comuns e Soluções

### Problema 1: "React Hook has missing dependency"

**Causa:** Hook sem `useCallback` ou dependências incorretas.

**Solução:**
```typescript
// ❌ Errado
const loadData = async () => {
  // ...
};
useEffect(() => { loadData(); }, []);

// ✅ Correto
const loadData = useCallback(async () => {
  // ...
}, [dependencies]);
useEffect(() => { loadData(); }, [loadData]);
```

### Problema 2: "Unexpected any"

**Causa:** Uso de `any` em vez de tipos específicos.

**Solução:**
```typescript
// ❌ Errado
const response = await fetch(...);
const data: any = await response.json();

// ✅ Correto
const response = await fetch(...);
const data: unknown = await response.json();
const record = data as Record<string, unknown>;
```

### Problema 3: Entity vs Primitives

**Causa:** Confusão entre Entity e dados primitivos.

**Solução:**
```typescript
// Entity (Domain)
const template: Template = Template.fromPrimitives({...});
template.isApproved(); // método de negócio

// Primitives (UI)
const primitive = template.toPrimitives();
console.log(primitive.name); // acesso direto
```

---

## 🎓 Dicas de Boas Práticas

1. **Sempre use `useCallback`** para funções assíncronas em hooks
2. **Use `useMemo`** para instâncias de repositórios/use cases
3. **Evite `any`**, prefira `unknown` e faça type assertion
4. **Mantenha compatibilidade** com UI existente usando `.toPrimitives()`
5. **Teste no navegador** após cada refatoração
6. **Compile antes de commitar** (`npm run build`)

---

## 📞 Suporte

Se encontrar problemas na migração:

1. Verifique o arquivo `ARCHITECTURE.md` para entender a estrutura
2. Compare com o código já refatorado (ex: `src/app/templates/page.tsx`)
3. Revise os hooks existentes em `src/application/hooks/`

---

## ✨ Exemplo Completo: Migração de uma Página

**Antes:**
```typescript
// src/app/old-page/page.tsx
"use client";
import { useState, useEffect } from 'react';

export default function OldPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data');
        const json = await res.json();
        setData(json.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

**Depois:**
```typescript
// src/app/new-page/page.tsx
"use client";
import { useData } from '@/application/hooks/useData';

export default function NewPage() {
  const { data, loading, error } = useData();

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;

  // Converter entities para primitivos (compatibilidade UI)
  const items = data.map(d => d.toPrimitives());

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

**Tamanho do código:** ⬇️ Reduzido de ~30 linhas para ~15 linhas!

**Benefícios:**
- ✅ Lógica de negócio centralizada
- ✅ Código mais limpo e legível
- ✅ Reutilizável em outros componentes
- ✅ Mais fácil de testar
- ✅ Type-safe
