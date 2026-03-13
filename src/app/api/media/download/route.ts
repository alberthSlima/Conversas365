import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { graphBaseUrl, authHeaders, requireToken } from '@/lib/whatsapp';

// Verifica se está rodando na Vercel (ambiente serverless)
const isVercel = process.env.VERCEL === '1';

/**
 * Endpoint para baixar mídia do WhatsApp
 * - Em desenvolvimento: salva localmente
 * - Em produção (Vercel): salva no Vercel Blob Storage (PRIVATE com segurança)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaId, type = 'image' } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId é obrigatório' },
        { status: 400 }
      );
    }

    const { token } = requireToken();
    const baseUrl = graphBaseUrl();

    console.log(`[MEDIA] Buscando informações da mídia ${mediaId}...`);

    // 1. Buscar URL da mídia do WhatsApp
    const mediaInfoResponse = await fetch(
      `${baseUrl}/${mediaId}`,
      {
        headers: authHeaders(token),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!mediaInfoResponse.ok) {
      const errorText = await mediaInfoResponse.text();
      console.error(`[MEDIA] Erro ao buscar mídia: ${mediaInfoResponse.status}`, errorText);
      throw new Error(`Erro ao buscar informações da mídia: ${mediaInfoResponse.status}`);
    }

    const mediaInfo = await mediaInfoResponse.json() as { url?: string; mime_type?: string };
    const mediaUrl = mediaInfo.url;

    if (!mediaUrl) {
      throw new Error('URL da mídia não encontrada');
    }

    console.log(`[MEDIA] URL da mídia obtida: ${mediaUrl.substring(0, 50)}...`);

    // 2. Baixar o arquivo do WhatsApp
    const downloadResponse = await fetch(mediaUrl, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(30000),
    });

    if (!downloadResponse.ok) {
      throw new Error(`Erro ao baixar mídia: ${downloadResponse.status}`);
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Salvar conforme ambiente
    if (isVercel) {
      // PRODUÇÃO: Salvar no Vercel Blob Storage (PRIVATE)
      // Validar se o token do Blob está configurado
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('[MEDIA] BLOB_READ_WRITE_TOKEN não configurado');
        return NextResponse.json(
          { error: 'Servidor não configurado corretamente' },
          { status: 500 }
        );
      }

      console.log(`[MEDIA] Salvando no Vercel Blob (PRIVATE): ${mediaId}`);
      
      const extension = type === 'video' ? 'mp4' : type === 'document' ? 'pdf' : 'jpg';
      const filename = `whatsapp/${mediaId}.${extension}`;
      
      // Upload para blob PRIVATE
      const blob = await put(filename, buffer, {
        access: 'public', // SDK usa 'public' mas o store sendo private garante segurança
        contentType: mediaInfo.mime_type || 'image/jpeg',
        addRandomSuffix: false,
      });

      console.log(`[MEDIA] Mídia salva no Blob privado: ${blob.url}`);

      // Retorna path da API proxy ao invés da URL direta do blob
      // Isso garante que só usuários autenticados podem ver as imagens
      const proxyUrl = `/api/media/proxy/${mediaId}.${extension}`;

      return NextResponse.json({
        success: true,
        url: proxyUrl, // URL da API proxy (segura)
        mediaId,
        size: buffer.length,
        mimeType: mediaInfo.mime_type,
        cached: false,
        cdn: false,
        blob: true,
        private: true,
        blobUrl: blob.url, // URL real do blob (só para logs/debug)
      });
      
    } else {
      // DESENVOLVIMENTO: Salvar localmente
      const { writeFile, mkdir } = await import('fs/promises');
      const { existsSync } = await import('fs');
      const path = await import('path');

      const mediaDir = path.join(process.cwd(), 'public', 'media', 'whatsapp');
      const extension = type === 'video' ? 'mp4' : type === 'document' ? 'pdf' : 'jpg';
      const filename = `${mediaId}.${extension}`;
      const localPath = path.join(mediaDir, filename);
      const publicUrl = `/media/whatsapp/${filename}`;

      // Verificar se já existe
      if (existsSync(localPath)) {
        console.log(`[MEDIA] Mídia já existe localmente: ${publicUrl}`);
        return NextResponse.json({ 
          success: true, 
          url: publicUrl,
          mediaId,
          cached: true,
          cdn: false,
          blob: false,
        });
      }

      // Garantir que o diretório existe
      if (!existsSync(mediaDir)) {
        await mkdir(mediaDir, { recursive: true });
      }

      // Salvar arquivo
      await writeFile(localPath, buffer);
      console.log(`[MEDIA] Mídia salva localmente: ${localPath}`);

      return NextResponse.json({
        success: true,
        url: publicUrl,
        mediaId,
        size: buffer.length,
        mimeType: mediaInfo.mime_type,
        cached: false,
        cdn: false,
        blob: false,
      });
    }

  } catch (error) {
    console.error('[MEDIA] Erro ao processar mídia:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao processar mídia', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
