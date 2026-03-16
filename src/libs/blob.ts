import { put, get, head } from '@vercel/blob';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

/**
 * Cliente Vercel Blob Storage (Private)
 * Centraliza toda a lógica de upload/download de mídia
 */

export type BlobUploadResult = {
  url: string;
  proxyUrl: string;
  size: number;
  contentType: string;
};

/**
 * Verifica se um blob existe
 */
export async function blobExists(path: string): Promise<boolean> {
  try {
    const result = await head(path);
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Upload de mídia para Vercel Blob (Private)
 */
export async function uploadToBlob(
  mediaId: string,
  buffer: Buffer,
  options: {
    type?: 'image' | 'video' | 'document';
    contentType?: string;
  } = {}
): Promise<BlobUploadResult> {
  const { type = 'image', contentType = 'image/jpeg' } = options;
  const extension = type === 'video' ? 'mp4' : type === 'document' ? 'pdf' : 'jpg';
  const filename = `whatsapp/${mediaId}.${extension}`;

  // Verificar se já existe
  const exists = await blobExists(filename);
  if (exists) {
    const existing = await head(filename);
    logger.debug('BLOB', `Mídia já existe: ${filename}`);
    return {
      url: existing.url,
      proxyUrl: `/api/media/proxy/${mediaId}.${extension}`,
      size: existing.size,
      contentType: existing.contentType || contentType,
    };
  }

  // Upload
  logger.info('BLOB', `Fazendo upload: ${filename}`);
  const blob = await put(filename, buffer, {
    access: 'private',
    contentType,
    addRandomSuffix: false,
  });

  logger.info('BLOB', `Upload concluído: ${blob.url}`);

  return {
    url: blob.url,
    proxyUrl: `/api/media/proxy/${mediaId}.${extension}`,
    size: buffer.length,
    contentType: blob.contentType || contentType,
  };
}

/**
 * Download de mídia do Vercel Blob (Private)
 */
export async function downloadFromBlob(path: string): Promise<{
  buffer: Uint8Array;
  contentType: string;
  size: number;
}> {
  const result = await get(path, {
    access: 'private',
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result || result.statusCode !== 200) {
    throw new Error(`Blob não encontrado: ${path}`);
  }

  // Ler stream e converter para buffer
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenar chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, position);
    position += chunk.length;
  }

  return {
    buffer,
    contentType: result.blob.contentType || 'image/jpeg',
    size: result.blob.size,
  };
}
