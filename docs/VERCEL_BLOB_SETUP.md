# 🚀 Guia Rápido: Configurar Vercel Blob Storage

## ✅ Passos para Deploy

### 1. Verificar Variáveis de Ambiente

Certifique-se que a Vercel tem estas variáveis:

```env
# Token do Blob (criado automaticamente pela Vercel)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx

# WhatsApp API
WHATSAPP_TOKEN=EAAxxxxxxxxx
WHATSAPP_PHONE_ID=123456789
WHATSAPP_VERIFY_TOKEN=your_verify_token

# API Backend
API_BASE_URL=https://api.medeiros365.com.br
API_USERNAME=your_username
API_PASSWORD=your_password
```

### 2. Blob Store já está criado ✅

Conforme o print que você mostrou:
- **Store ID**: `store_AOfZShk1UcG84kz8`
- **Region**: Washington, D.C., USA (IAD1)
- **Base URL**: `https://adfzshk1ucg84kz8.private.blob.vercel-storage.com`
- **Access**: Private (Beta)

⚠️ **Importante**: Seu blob está como **Private**. Para imagens do chat funcionarem, você precisa:

**Opção A (Recomendado):** Mudar para **Public**
1. Vá no dashboard do Blob Store
2. Em "Store Access", mude de "Private" para "Public"
3. Isso permite que as imagens sejam carregadas diretamente no navegador

**Opção B:** Manter Private e usar tokens
- Requer autenticação para cada imagem
- Mais complexo, melhor para dados sensíveis

### 3. Deploy na Vercel

```bash
# Commitar mudanças
git add .
git commit -m "feat: integração com Vercel Blob Storage"
git push origin main
```

O deploy será automático se você tem GitHub integrado.

### 4. Testar Funcionamento

Após o deploy:

1. Envie um template com carousel
2. Acesse o chat na Vercel
3. Clique em "Baixar" nas imagens
4. Verifique os logs da Vercel:

```
[MEDIA] Salvando no Vercel Blob: 123456789
[MEDIA] Mídia salva no Blob: https://...blob.vercel-storage.com/whatsapp/123456789.jpg
```

5. Verifique no Dashboard:
   - Vá em **Storage** → seu Blob
   - Deve aparecer pasta `whatsapp/` com imagens

### 5. Verificar URLs

As imagens devem ser servidas de URLs como:

```
https://adfzshk1ucg84kz8.public.blob.vercel-storage.com/whatsapp/123456789.jpg
```

Se o blob for **Private**, a URL terá um token:
```
https://adfzshk1ucg84kz8.private.blob.vercel-storage.com/whatsapp/123456789.jpg?token=xxxxx
```

## ⚠️ Atenção: Access Mode

### Se o Blob for Public:
✅ Imagens carregam direto no navegador  
✅ Mais simples e rápido  
✅ Recomendado para chat público  

### Se o Blob for Private:
⚠️ Precisa de token para cada imagem  
⚠️ Mais complexo de implementar  
✅ Melhor para dados sensíveis  

**Para o caso de um chat, recomendo mudar para Public.**

## 📊 Monitoramento

Após deploy, monitore:

1. **Logs da Vercel**:
   - Functions → Logs
   - Procure por `[MEDIA]`

2. **Storage Dashboard**:
   - Storage → seu Blob
   - Veja arquivos salvos
   - Monitore uso (1GB grátis)

3. **Teste Manual**:
   - Envie carousel
   - Baixe imagem
   - Verifique se URL permanece após refresh

## 🔍 Troubleshooting

### Erro: "BLOB_READ_WRITE_TOKEN not found"
- ✅ Já configurado (visível no seu print)

### Imagens não aparecem
- Verifique se blob está como **Public**
- Veja logs da função no Vercel
- Teste a URL diretamente no navegador

### Erro 500 na API
- Verifique variáveis de ambiente
- Veja logs completos na Vercel
- Teste localmente primeiro com `npm run dev`

## ✅ Checklist Final

- [x] Pacote `@vercel/blob` instalado
- [x] Código implementado (dual mode)
- [x] Blob Store criado na Vercel
- [x] Token `BLOB_READ_WRITE_TOKEN` configurado
- [ ] **Mudar Blob Access de Private para Public**
- [ ] Fazer deploy (git push)
- [ ] Testar envio de carousel
- [ ] Verificar imagens no Storage
- [ ] Confirmar URLs permanentes

## 🎯 Próximo Passo

**Fazer o deploy:**

```bash
git add .
git commit -m "feat: Vercel Blob Storage para mídias permanentes"
git push origin main
```

Após o deploy, teste enviando um carousel e verificando se as imagens são salvas no Blob Storage! 🚀
