# Sistema de Armazenamento de Mídia do WhatsApp

## 📁 Estrutura

As mídias do WhatsApp são baixadas e salvas localmente em:
```
public/media/whatsapp/
```

## 🔄 Como Funciona

### 1. Download Automático
Quando um template com mídia é enviado:
- O sistema detecta automaticamente as imagens/vídeos/documentos
- Baixa do WhatsApp Business API usando o `mediaId`
- Salva localmente na pasta `public/media/whatsapp/`
- Formato: `{mediaId}.{extensão}` (ex: `3369884786498531.jpg`)

### 2. Renderização no Chat
O componente de chat tenta carregar as mídias na seguinte ordem:
1. **Primeiro**: Busca localmente em `/media/whatsapp/{mediaId}.jpg`
2. **Fallback**: Se não encontrar, busca no Facebook CDN
3. **Placeholder**: Se ambos falharem, mostra uma mensagem de erro

### 3. Cache
- Se a mídia já existe localmente, não faz download novamente
- Economia de banda e velocidade de carregamento

## 🛠️ Endpoints da API

### `/api/media/download` (POST)
Baixa uma mídia do WhatsApp e salva localmente.

**Request:**
```json
{
  "mediaId": "3369884786498531",
  "type": "image" // ou "video", "document"
}
```

**Response:**
```json
{
  "success": true,
  "url": "/media/whatsapp/3369884786498531.jpg",
  "mediaId": "3369884786498531",
  "size": 123456,
  "mimeType": "image/jpeg",
  "cached": false
}
```

### `/api/media/cleanup` (POST)
Remove mídias antigas para liberar espaço.

**Request:**
```
POST /api/media/cleanup?days=30
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 10,
  "deletedSize": 5242880,
  "deletedSizeMB": "5.00",
  "message": "10 arquivo(s) deletado(s), 5.00 MB liberados"
}
```

## 🔐 Variáveis de Ambiente

O sistema precisa do token do WhatsApp:
```env
WHATSAPP_TOKEN=your_token_here
```

## 🗑️ Limpeza Automática

Para configurar limpeza automática (opcional), você pode:

1. **Criar um cron job** (Linux/Mac):
```bash
# Limpar mídias com mais de 30 dias, todo dia às 2h
0 2 * * * curl -X POST http://localhost:3000/api/media/cleanup?days=30
```

2. **Usar Task Scheduler** (Windows)

3. **Usar um serviço de cron no Vercel/Cloud**

## 📊 Benefícios

✅ **Performance**: Imagens carregam mais rápido (local vs CDN externo)  
✅ **Confiabilidade**: Mídias não expiram (WhatsApp CDN tem tempo limitado)  
✅ **Controle**: Você gerencia as mídias, não depende de serviços externos  
✅ **Economia**: Menos requisições para APIs externas  
✅ **Privacidade**: Mídias ficam no seu servidor  

## ⚠️ Considerações

- As mídias **não são comitadas** no Git (ver `.gitignore`)
- Configure backup da pasta `public/media/` se necessário
- Monitore o espaço em disco
- Configure limpeza automática para evitar acúmulo
