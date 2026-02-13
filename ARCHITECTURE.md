# 🏗️ Arquitetura do Projeto - Clean Architecture + DDD

## 📋 Visão Geral

Este projeto foi refatorado para seguir os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**, proporcionando:

- ✅ **Separação de responsabilidades**
- ✅ **Código testável e manutenível**
- ✅ **Baixo acoplamento entre camadas**
- ✅ **Regras de negócio isoladas**
- ✅ **Facilidade para adicionar novos recursos**

---

## 🗂️ Estrutura de Pastas

```
src/
├── domain/                    # Camada de Domínio (Regras de Negócio)
│   ├── entities/             # Entidades do Domínio
│   │   ├── Template.ts       # Entidade de Template
│   │   └── Message.ts        # Entidade de Mensagem
│   ├── value-objects/        # Objetos de Valor
│   │   ├── PhoneNumber.ts    # Número de telefone validado
│   │   └── TemplateId.ts     # ID de template
│   └── repositories/         # Interfaces de Repositórios
│       ├── ITemplateRepository.ts
│       └── IMessageRepository.ts
│
├── application/              # Camada de Aplicação (Casos de Uso)
│   ├── use-cases/           # Use Cases
│   │   ├── GetTemplatesUseCase.ts
│   │   ├── SendTemplateUseCase.ts
│   │   └── GetMessagesUseCase.ts
│   ├── hooks/               # React Hooks Customizados
│   │   ├── useTemplates.ts
│   │   ├── useTemplate.ts
│   │   ├── useSendTemplate.ts
│   │   └── useMessages.ts
│   └── dtos/                # Data Transfer Objects
│
├── infrastructure/          # Camada de Infraestrutura (Implementações)
│   ├── repositories/       # Implementações concretas dos repositórios
│   │   ├── TemplateRepository.ts
│   │   └── MessageRepository.ts
│   └── http/              # Cliente HTTP
│       └── ApiClient.ts
│
├── components/            # Componentes React (UI)
├── app/                   # Next.js App Router
└── lib/                   # Utilitários compartilhados
```

---

## 🎯 Camadas da Arquitetura

### 1️⃣ **Domain Layer** (Camada de Domínio)

**Responsabilidade:** Contém as regras de negócio puras, sem dependências externas.

#### 📦 **Entities** (Entidades)
Objetos com identidade única que representam conceitos do negócio.

**Exemplo: `Template`**
```typescript
import { Template } from '@/domain/entities/Template';

// Criar um template a partir de dados primitivos
const template = Template.fromPrimitives({
  id: '123',
  name: 'Welcome Message',
  language: 'pt_BR',
  status: 'APPROVED',
  category: 'MARKETING',
  components: [],
});

// Métodos de negócio
template.isApproved(); // true
template.hasComponents(); // false
template.getBodyComponent(); // undefined
```

#### 💎 **Value Objects** (Objetos de Valor)
Objetos imutáveis sem identidade, definidos apenas por seus valores.

**Exemplo: `PhoneNumber`**
```typescript
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';

// Criar e validar número de telefone
const phone = PhoneNumber.create('5599991187797');

phone.getValue(); // '5599991187797'
phone.toFormattedString(); // '(99) 99911-87797'

// Criação segura (retorna null se inválido)
const maybePhone = PhoneNumber.createOrNull('invalid'); // null
```

#### 🔌 **Repository Interfaces**
Contratos que definem como os dados serão acessados.

**Exemplo: `ITemplateRepository`**
```typescript
export interface ITemplateRepository {
  findAll(): Promise<Template[]>;
  findById(id: TemplateId): Promise<Template | null>;
  findApproved(): Promise<Template[]>;
  searchByName(searchTerm: string): Promise<Template[]>;
}
```

---

### 2️⃣ **Application Layer** (Camada de Aplicação)

**Responsabilidade:** Orquestra os casos de uso da aplicação.

#### 🎬 **Use Cases** (Casos de Uso)
Implementam a lógica de aplicação específica.

**Exemplo: `GetTemplatesUseCase`**
```typescript
import { GetApprovedTemplatesUseCase } from '@/application/use-cases/GetTemplatesUseCase';
import { TemplateRepository } from '@/infrastructure/repositories/TemplateRepository';

const repository = new TemplateRepository();
const useCase = new GetApprovedTemplatesUseCase(repository);

const templates = await useCase.execute();
```

**Exemplo: `SendTemplateUseCase`**
```typescript
import { SendTemplateUseCase } from '@/application/use-cases/SendTemplateUseCase';

const useCase = new SendTemplateUseCase();

// Enviar para um único número
const result = await useCase.executeSingle({
  to: '5599991187797',
  template: {
    name: 'welcome_message',
    language: { code: 'pt_BR' },
    components: [],
  },
});

// Enviar para múltiplos números
const results = await useCase.executeMultiple(
  { template: {...} },
  ['5599991187797', '5599982853513']
);

// Validar números antes de enviar
const { valid, invalid } = useCase.validatePhones([
  '5599991187797',
  'invalid-number',
]);
```

#### 🪝 **Custom Hooks**
Facilitam o uso dos Use Cases em componentes React.

**Exemplo: `useTemplates`**
```typescript
import { useTemplates } from '@/application/hooks/useTemplates';

function TemplatesPage() {
  const { templates, loading, error, reload, search } = useTemplates();

  // templates: Template[] - Lista de templates aprovados
  // loading: boolean - Estado de carregamento
  // error: string | null - Mensagem de erro
  // reload: () => Promise<void> - Recarregar templates
  // search: (term: string) => Promise<void> - Buscar templates

  return (
    <div>
      {loading && <p>Carregando...</p>}
      {error && <p>Erro: {error}</p>}
      {templates.map(t => (
        <div key={t.getId().getValue()}>
          {t.getName()}
        </div>
      ))}
    </div>
  );
}
```

**Exemplo: `useSendTemplate`**
```typescript
import { useSendTemplate } from '@/application/hooks/useSendTemplate';

function SendTemplateForm() {
  const { sending, results, sendToMultiple, validatePhones, clearResults } = useSendTemplate();

  const handleSubmit = async (formData) => {
    const phones = ['5599991187797', '5599982853513'];
    const templateData = { /* ... */ };
    
    const results = await sendToMultiple(templateData, phones);
    
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ Enviado para ${result.phone}`);
      } else {
        console.error(`❌ Falha para ${result.phone}: ${result.error}`);
      }
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

### 3️⃣ **Infrastructure Layer** (Camada de Infraestrutura)

**Responsabilidade:** Implementa detalhes técnicos (APIs, banco de dados, etc).

#### 🏪 **Repository Implementations**
Implementam as interfaces definidas no domínio.

**Exemplo: `TemplateRepository`**
```typescript
import { TemplateRepository } from '@/infrastructure/repositories/TemplateRepository';

const repository = new TemplateRepository();

// Buscar todos os templates
const all = await repository.findAll();

// Buscar por ID
const template = await repository.findById(TemplateId.create('123'));

// Buscar aprovados
const approved = await repository.findApproved();

// Pesquisar por nome
const searched = await repository.searchByName('welcome');
```

#### 🌐 **ApiClient**
Cliente HTTP centralizado para comunicação com APIs.

**Exemplo:**
```typescript
import { ApiClient } from '@/infrastructure/http/ApiClient';

const client = new ApiClient('/api/whatsapp');

// GET request
const data = await client.get<{ data: any[] }>('/templates');

// POST request
const result = await client.post('/send-template', {
  to: '5599991187797',
  template: { /* ... */ },
});
```

---

## 🔄 Fluxo de Dados

```
┌─────────────┐
│     UI      │  (Componentes React)
│  Components │
└──────┬──────┘
       │ usa hooks
       ▼
┌─────────────┐
│   Hooks     │  (useTemplates, useSendTemplate)
│ (Application)│
└──────┬──────┘
       │ chama use cases
       ▼
┌─────────────┐
│  Use Cases  │  (GetTemplates, SendTemplate)
│ (Application)│
└──────┬──────┘
       │ usa repositórios
       ▼
┌─────────────┐
│ Repositories│  (TemplateRepository)
│(Infrastructure)│
└──────┬──────┘
       │ usa ApiClient
       ▼
┌─────────────┐
│  API Client │  (HTTP requests)
│(Infrastructure)│
└──────┬──────┘
       │
       ▼
   External API
```

---

## 📝 Exemplos de Uso

### Página de Templates Refatorada

**Antes:**
```typescript
export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      const res = await fetch('/api/whatsapp/templates');
      const json = await res.json();
      setTemplates(json.data.filter(t => t.status === 'APPROVED'));
      setLoading(false);
    }
    fetchTemplates();
  }, []);

  // ...
}
```

**Depois (Clean Architecture):**
```typescript
import { useTemplates } from '@/application/hooks/useTemplates';

export default function TemplatesPage() {
  const { templates, loading, error } = useTemplates();
  
  // Templates já vêm filtrados (apenas APPROVED)
  // Toda lógica de negócio está nos Use Cases
  // UI apenas renderiza os dados

  return (
    // ...
  );
}
```

### Envio de Templates

```typescript
import { useSendTemplate } from '@/application/hooks/useSendTemplate';

function SendForm() {
  const { sending, sendToMultiple, validatePhones } = useSendTemplate();

  const handleSubmit = async (formData) => {
    // Validar números
    const phones = formData.phones.split(',');
    const { valid, invalid } = validatePhones(phones);

    if (invalid.length > 0) {
      alert(`Números inválidos: ${invalid.join(', ')}`);
      return;
    }

    // Enviar template
    const results = await sendToMultiple(
      {
        template: {
          name: formData.templateName,
          language: { code: 'pt_BR' },
          components: formData.components,
        },
      },
      valid
    );

    // Processar resultados
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    alert(`✅ ${successCount} enviados | ❌ ${failCount} falharam`);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## ✅ Benefícios

1. **Testabilidade:** Cada camada pode ser testada isoladamente
2. **Manutenibilidade:** Código organizado e fácil de entender
3. **Escalabilidade:** Adicionar novos recursos sem quebrar o existente
4. **Independência de Frameworks:** Regras de negócio não dependem de React/Next.js
5. **Reutilização:** Use Cases podem ser usados em diferentes contextos
6. **Type Safety:** TypeScript garante tipo em todas as camadas

---

## 🔜 Próximos Passos

- [ ] Adicionar testes unitários para Entities e Value Objects
- [ ] Adicionar testes de integração para Repositories
- [ ] Adicionar testes E2E para Use Cases
- [ ] Implementar cache para reduzir chamadas à API
- [ ] Adicionar logging estruturado
- [ ] Implementar retry logic para chamadas de API
- [ ] Adicionar documentação de API com Swagger

---

## 📚 Referências

- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [React Hooks](https://react.dev/reference/react)
- [Next.js Documentation](https://nextjs.org/docs)
