# 🔑 Como Obter o Token do Vercel Blob

## 📋 Informações do seu Blob Store

Com base nas imagens fornecidas, seu Blob Store tem:

- **Store ID:** `store_ADfZShk1UcG84kz8`
- **Region:** `Washington, D.C., USA (IAD1)`
- **Access Mode:** `Private` (Beta) ✅
- **Base URL:** `https://adfzshk1ucg84kz8.private.blob.vercel-storage.com`

---

## 🎯 Passo a Passo para Obter o Token

### 1️⃣ Acesse o Vercel Dashboard

1. Vá em: https://vercel.com/dashboard
2. Selecione seu projeto: **Conversas365**

### 2️⃣ Vá para Storage → Blob

1. No menu lateral esquerdo, clique em **"Storage"**
2. Depois clique em **"Blob"**
3. Você verá seu store: `store_ADfZShk1UcG84kz8`

### 3️⃣ Clique no Store

1. Clique no card do seu Blob Store
2. Você verá informações detalhadas do store

### 4️⃣ Procure por ".env.local" ou "Quickstart"

Procure por uma das seguintes seções:

- **Tab ".env.local"** (geralmente no topo)
- **Quickstart / Getting Started**
- **Settings → Environment Variables**

### 5️⃣ Copie o Token

Você verá algo assim:

```bash
# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXXX_YYYYYYYYYYYYYYYYYY
```

**Importante:** O token começa com `vercel_blob_rw_`

### 6️⃣ Cole no `.env.local`

Abra o arquivo `.env.local` e substitua `seu_token_aqui` pelo token real:

```bash
# Vercel Blob Storage (Private)
# Store ID: store_ADfZShk1UcG84kz8
# Region: Washington, D.C., USA (IAD1)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXXX_YYYYYYYYYYYYYYYYYY
BLOB_STORE_ID=store_ADfZShk1UcG84kz8
BLOB_BASE_URL=https://adfzshk1ucg84kz8.private.blob.vercel-storage.com
```

---

## 🚀 Testando Localmente

Depois de adicionar o token:

1. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Teste o upload/download:**
   - Envie uma mensagem com imagem no chat
   - Clique no botão de download
   - Verifique os logs no terminal

3. **Verificar logs esperados:**
   ```
   [MEDIA] Salvando no Vercel Blob (PRIVATE): 123456789
   [MEDIA] Mídia salva no Blob privado: https://...
   [MEDIA] Proxy URL retornado: /api/media/proxy/123456789.jpg
   ```

---

## 🔒 Segurança

⚠️ **NUNCA comite o `.env.local` no Git!**

O arquivo `.env.local` já está no `.gitignore`, mas sempre verifique:

```bash
git status
```

Se aparecer `.env.local` na lista, **NÃO faça commit!**

---

## 🌐 Configuração na Vercel (Produção)

Quando fizer o deploy:

### Opção 1: Conectar o Blob Store ao Projeto

1. Vercel Dashboard → Seu Projeto → **Storage**
2. Clique em **"Connect Store"**
3. Selecione o Blob Store: `store_ADfZShk1UcG84kz8`
4. Clique em **"Connect"**

✅ **O token será adicionado automaticamente nas variáveis de ambiente!**

### Opção 2: Adicionar Manualmente

1. Vercel Dashboard → Seu Projeto → **Settings**
2. **Environment Variables**
3. Adicione:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXX
```

4. **Importante:** Selecione os ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Clique em **"Save"**

---

## 📊 Monitoramento

Após configurar, você pode monitorar no Vercel Dashboard:

### Storage Usage
- **Path:** Dashboard → Storage → Blob → seu store
- **Métricas:**
  - Storage usado (GB)
  - Bandwidth (GB)
  - Operations (put, get, list, head)

### Logs
- **Path:** Dashboard → Seu Projeto → Logs
- **Procure por:**
  - `[MEDIA] Salvando no Vercel Blob`
  - `[MEDIA PROXY] Servindo mídia privada`

---

## ❓ Não Encontrou o Token?

### Tente estas alternativas:

1. **Quickstart Tab:**
   - Na página do Blob Store, procure por "Quickstart"
   - Lá deve ter código de exemplo com o token

2. **Conectar via CLI:**
   ```bash
   vercel link
   vercel env pull .env.local
   ```
   
   Isso vai baixar automaticamente as variáveis de ambiente do projeto.

3. **Criar novo token:**
   - No Blob Store, procure por "Generate New Token"
   - Copie o novo token gerado

4. **Suporte Vercel:**
   - Se ainda não conseguir, abra um ticket: https://vercel.com/help

---

## ✅ Checklist Final

Antes de fazer deploy, certifique-se:

- [ ] Token copiado e colado no `.env.local`
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Teste local funcionando (upload/download de imagem)
- [ ] `.env.local` NÃO está no Git
- [ ] Blob Store conectado ao projeto na Vercel (ou variável adicionada manualmente)
- [ ] Build passou sem erros (`npm run build`)

---

## 🎯 Próximo Passo

Depois de obter e configurar o token, você pode:

1. Testar localmente primeiro
2. Fazer deploy na Vercel
3. Testar em produção
4. Implementar autenticação no proxy (Next-Auth)

Se tiver problemas, verifique os logs e compartilhe comigo! 🚀
