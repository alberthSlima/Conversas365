import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { graphBaseUrl, authHeaders, requireToken } from '@/lib/whatsapp';

/**
 * Endpoint para baixar mídia do WhatsApp e salvar localmente
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

    // Verificar se já existe localmente
    const mediaDir = path.join(process.cwd(), 'public', 'media', 'whatsapp');
    const extension = type === 'video' ? 'mp4' : type === 'document' ? 'pdf' : 'jpg';
    const filename = `${mediaId}.${extension}`;
    const localPath = path.join(mediaDir, filename);
    const publicUrl = `/media/whatsapp/${filename}`;

    // Se já existe, retorna o caminho
    if (existsSync(localPath)) {
      console.log(`[MEDIA] Mídia já existe localmente: ${publicUrl}`);
      return NextResponse.json({ 
        success: true, 
        url: publicUrl,
        mediaId,
        cached: true 
      });
    }

    // Usar funções do whatsapp.ts
    const { token } = requireToken();
    const baseUrl = graphBaseUrl();

    console.log(`[MEDIA] Buscando informações da mídia ${mediaId}...`);
    
    // 1. Buscar URL da mídia
    const mediaInfoResponse = await fetch(
      `${baseUrl}/${mediaId}`,
      {
        headers: authHeaders(token),
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

    console.log(`[MEDIA] URL da mídia: ${mediaUrl}`);

    // 2. Baixar o arquivo
    const downloadResponse = await fetch(mediaUrl, {
      headers: authHeaders(token),
    });

    if (!downloadResponse.ok) {
      throw new Error(`Erro ao baixar mídia: ${downloadResponse.status}`);
    }

    const buffer = Buffer.from(await downloadResponse.arrayBuffer());

    // 3. Garantir que o diretório existe
    if (!existsSync(mediaDir)) {
      await mkdir(mediaDir, { recursive: true });
    }

    // 4. Salvar o arquivo
    await writeFile(localPath, buffer);

    console.log(`[MEDIA] Mídia salva em: ${localPath}`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaId,
      size: buffer.length,
      mimeType: mediaInfo.mime_type,
      cached: false,
    });

  } catch (error) {
    console.error('[MEDIA] Erro ao baixar mídia:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao baixar mídia', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
