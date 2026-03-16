import { NextRequest, NextResponse } from 'next/server';
import { getMediaInfo, downloadMedia } from '@/libs/whatsapp';
import { uploadToBlob } from '@/libs/blob';
import { mediaDownloadSchema } from '@/validations/media';
import { handleApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * POST /api/media/download
 * Baixa mídia do WhatsApp e salva no Vercel Blob Storage (Private)
 */
export async function POST(request: NextRequest) {
  try {
    // Validar request
    const body = await request.json();
    const { mediaId, type } = mediaDownloadSchema.parse(body);

    logger.info('MEDIA:DOWNLOAD', `Iniciando download: ${mediaId}`);

    // 1. Buscar informações da mídia
    const mediaInfo = await getMediaInfo(mediaId);
    logger.debug('MEDIA:DOWNLOAD', `Mídia encontrada: ${mediaInfo.mime_type}, ${mediaInfo.file_size} bytes`);

    // 2. Baixar mídia do WhatsApp
    const buffer = await downloadMedia(mediaInfo.url);
    logger.debug('MEDIA:DOWNLOAD', `Download concluído: ${buffer.length} bytes`);

    // 3. Upload para Vercel Blob
    const result = await uploadToBlob(mediaId, buffer, {
      type,
      contentType: mediaInfo.mime_type,
    });

    logger.info('MEDIA:DOWNLOAD', `Upload para Blob concluído: ${result.proxyUrl}`);

    return NextResponse.json({
      success: true,
      url: result.proxyUrl,
      mediaId,
      size: result.size,
      mimeType: result.contentType,
      cached: false,
      cdn: false,
      blob: true,
      private: true,
      blobUrl: result.url,
    });

  } catch (error) {
    return handleApiError(error);
  }
}
