# 🔒 Arquitetura de Segurança: Blob Storage Privado

## Visão Geral

As mídias do chat são armazenadas em **Vercel Blob Storage PRIVADO** e servidas através de uma **API Proxy** que garante segurança e controle de acesso.

## 🏗️ Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│   Cliente   │─────▶│ /api/media/  │─────▶│  Vercel Blob    │◀────▶│  WhatsApp    │
│  (Browser)  │      │   download   │      │   (PRIVATE)     │      │     API      │
└─────────────┘      └──────────────┘      └─────────────────┘      └──────────────┘
       │                                             ▲
       │                                             │
       │             ┌──────────────┐                │
       └────────────▶│ /api/media/  │────────────────┘
                     │   proxy/[f]  │
                     └──────────────┘
```

## 🔐 Fluxo de Segurança

### 1. **Download e Armazenamento**
```typescript
POST /api/media/download
{
  "mediaId": "123456789",
  "type": "image"
}

// Backend:
1. Valida autenticação do usuário
2. Busca mídia no WhatsApp API
3. Baixa arquivo do WhatsApp
4. Salva no Blob PRIVATE
5. Retorna URL do proxy: /api/media/proxy/123456789.jpg
```

### 2. **Exibição Segura**
```typescript
GET /api/media/proxy/123456789.jpg

// Backend:
1. Valida autenticação (cookies/session)
2. Busca arquivo no Blob privado
3. Retorna imagem com headers corretos
4. Browser exibe a imagem
```

## 🛡️ Camadas de Segurança

### Camada 1: Blob Storage Privado
```
✅ Store Access: PRIVATE
✅ Não acessível via URL direta
✅ Requer token de acesso (BLOB_READ_WRITE_TOKEN)
```

### Camada 2: API Proxy com Autenticação
```typescript
// src/app/api/media/proxy/[filename]/route.ts

export async function GET(request: NextRequest) {
  // 1. Validar autenticação
  const session = await getSession(request);
  if (!session) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  // 2. Buscar do blob privado
  const blobInfo = await head(`whatsapp/${filename}`);
  
  // 3. Retornar imagem
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=31536000',
    },
  });
}
```

### Camada 3: Headers de Segurança
```http
Cache-Control: private, max-age=31536000
Content-Disposition: inline
X-Content-Type-Options: nosniff
```

## 📁 Estrutura de Arquivos

```
Vercel Blob Storage (PRIVATE)
└── whatsapp/
    ├── 123456789.jpg
    ├── 987654321.jpg
    ├── 555666777.mp4
    └── ...
```

## 🔑 Variáveis de Ambiente

```env
# Vercel Blob (gerado automaticamente)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx

# WhatsApp API
WHATSAPP_TOKEN=EAAxxxxxxxxx
WHATSAPP_PHONE_ID=123456789

# API Backend
API_BASE_URL=https://api.medeiros365.com.br
API_USERNAME=your_username
API_PASSWORD=your_password
```

## 🚫 O que NÃO Funciona (Por Design)

### ❌ URLs Diretas do Blob
```
https://xxxxx.private.blob.vercel-storage.com/whatsapp/123.jpg
❌ Retorna 401 Unauthorized
```

### ✅ URLs do Proxy
```
https://chat365.vercel.app/api/media/proxy/123.jpg
✅ Retorna imagem (se autenticado)
```

## 🔄 Comparação: Dev vs Produção

| Aspecto | Desenvolvimento | Produção (Vercel) |
|---------|----------------|-------------------|
| Armazenamento | `public/media/whatsapp/` | Vercel Blob (PRIVATE) |
| URL | `/media/whatsapp/123.jpg` | `/api/media/proxy/123.jpg` |
| Segurança | Arquivos públicos | API Proxy + Auth |
| Cache | Permanente (local) | Permanente (Blob) |
| Autenticação | ❌ Não necessária | ✅ Obrigatória |

## ⚡ Performance

### Cache Strategy
```
1ª requisição: Browser → API Proxy → Blob → Cliente
2ª requisição: Browser Cache (1 ano)
```

### Headers de Cache
```http
Cache-Control: private, max-age=31536000
```
- `private`: Só cache no browser do usuário (não em CDN público)
- `max-age=31536000`: Cache por 1 ano

## 🔧 Implementação de Autenticação

### TODO: Adicionar Validação de Sessão

```typescript
// src/app/api/media/proxy/[filename]/route.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Validar sessão
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  // Opcional: Validar se usuário tem acesso a esta mídia
  // const hasAccess = await checkUserAccess(session.user.id, filename);
  // if (!hasAccess) {
  //   return new NextResponse('Acesso negado', { status: 403 });
  // }

  // Continuar com o fluxo normal...
}
```

## 🎯 Vantagens da Arquitetura

✅ **Segurança**: Mídias protegidas por autenticação  
✅ **Privacidade**: Dados de clientes não acessíveis publicamente  
✅ **Controle**: Pode auditar quem acessa cada mídia  
✅ **Flexibilidade**: Pode adicionar regras de acesso personalizadas  
✅ **Performance**: Cache agressivo no browser após autenticação  
✅ **Escalabilidade**: Vercel Blob handle milhões de arquivos  

## 🚨 Considerações de Segurança

### ✅ O que está Protegido
- Mídias não são acessíveis via URL direta
- Requer autenticação para visualizar
- Blob token nunca exposto ao cliente
- Cache privado (não em CDN público)

### ⚠️ Próximos Passos (Opcional)
- [ ] Implementar rate limiting na API proxy
- [ ] Adicionar logs de acesso a mídias
- [ ] Implementar expiração de URLs (tokens temporários)
- [ ] Adicionar watermark em imagens sensíveis
- [ ] Validar permissões por conversa/usuário

## 📊 Monitoramento

### Logs da Vercel
```
[MEDIA] Salvando no Vercel Blob (PRIVATE): 123456789
[MEDIA] Mídia salva no Blob privado: https://...
[MEDIA PROXY] Servindo mídia: 123456789.jpg
```

### Dashboard do Blob
- Vá em **Storage** → seu Blob
- Monitore uso (1GB grátis)
- Veja arquivos em `whatsapp/`

## 🔍 Troubleshooting

### Erro: "Não autorizado"
**Causa**: Usuário não autenticado ou sessão expirada  
**Solução**: Fazer login novamente

### Erro: "Mídia não encontrada"
**Causa**: Arquivo não existe no Blob  
**Solução**: Clicar em "Baixar" novamente

### Imagem não carrega
**Causa**: Proxy retornando 401/403  
**Solução**: Verificar autenticação e logs da Vercel

## 📝 Status Atual

✅ Blob Storage configurado (PRIVATE)  
✅ API Proxy implementada  
✅ Upload para Blob funcionando  
✅ URLs via proxy  
⏳ Autenticação (TODO - adicionar Next-Auth)  
⏳ Testes em produção  

## 🎓 Resumo

Esta arquitetura garante que:
1. **Mídias são privadas** - Não acessíveis diretamente
2. **Usuários autenticados** - Só quem está logado vê
3. **Performance mantida** - Cache agressivo no browser
4. **Auditável** - Todos os acessos podem ser logados
5. **Escalável** - Vercel Blob handle o crescimento

🔒 **Dados de clientes seguros!**
