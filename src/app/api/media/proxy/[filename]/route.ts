import { NextRequest, NextResponse } from 'next/server';
import { downloadFromBlob } from '@/libs/blob';
import { handleApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * GET /api/media/proxy/[filename]
 * Serve mídias do Vercel Blob Storage (Private) com autenticação
 */

type RouteParams = {
  params: Promise<{
    filename: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { filename } = await context.params;

    if (!filename) {
      return new NextResponse('Filename é obrigatório', { status: 400 });
    }

    // TODO: Adicionar autenticação
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return new NextResponse('Não autorizado', { status: 401 });
    // }

    logger.debug('MEDIA:PROXY', `Servindo: ${filename}`);

    // Buscar do Blob
    const blobPath = `whatsapp/${filename}`;
    const result = await downloadFromBlob(blobPath);

    logger.debug('MEDIA:PROXY', `Blob encontrado: ${result.size} bytes`);

    // Retornar com cache privado
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': result.size.toString(),
        'Cache-Control': 'private, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
}
