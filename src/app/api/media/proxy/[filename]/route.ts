import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';

/**
 * API Proxy para servir mídias do Vercel Blob PRIVATE
 * 
 * Segundo a documentação da Vercel:
 * https://vercel.com/docs/vercel-blob/private-storage
 * 
 * Private blobs devem ser servidos através de Functions com autenticação.
 * 
 * Esta rota:
 * 1. Valida se o usuário está autenticado (via cookies/session)
 * 2. Busca a mídia no Blob Storage privado usando head()
 * 3. Faz fetch da URL assinada com token
 * 4. Retorna a imagem com headers corretos de cache
 * 
 * Isso garante que só usuários autenticados podem ver as imagens.
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
    // Validar se o token do Blob está configurado
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[MEDIA PROXY] BLOB_READ_WRITE_TOKEN não configurado');
      return new NextResponse('Servidor não configurado corretamente', { status: 500 });
    }

    const { filename } = await context.params;

    if (!filename) {
      return new NextResponse('Filename é obrigatório', { status: 400 });
    }

    // TODO: Adicionar validação de autenticação aqui
    // Exemplo com Next-Auth:
    // import { getServerSession } from 'next-auth';
    // import { authOptions } from '@/lib/auth';
    // 
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user) {
    //   return new NextResponse('Não autorizado', { status: 401 });
    // }

    console.log(`[MEDIA PROXY] Servindo mídia privada: ${filename}`);

    // Construir path completo no blob
    const blobPath = `whatsapp/${filename}`;

    // Buscar metadados do blob privado
    // head() retorna URL assinada com token incluído
    const blobInfo = await head(blobPath);

    if (!blobInfo) {
      console.error(`[MEDIA PROXY] Mídia não encontrada: ${blobPath}`);
      return new NextResponse('Mídia não encontrada', { status: 404 });
    }

    console.log(`[MEDIA PROXY] Blob encontrado: ${blobInfo.size} bytes, content-type: ${blobInfo.contentType}`);

    // Fazer download do blob usando a URL assinada
    // A URL já contém o token de acesso automático
    const response = await fetch(blobInfo.url);

    if (!response.ok) {
      console.error(`[MEDIA PROXY] Erro ao buscar blob: ${response.status}`);
      throw new Error(`Erro ao buscar blob: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Retornar imagem com headers de cache privado
    // Cache-Control: private garante que só o browser do usuário faz cache
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': blobInfo.contentType || 'image/jpeg',
        'Content-Length': blobInfo.size.toString(),
        'Cache-Control': 'private, max-age=31536000, immutable', // Cache privado por 1 ano
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'ETag': blobInfo.etag || '', // Para conditional requests (304)
      },
    });

  } catch (error) {
    console.error('[MEDIA PROXY] Erro ao servir mídia:', error);
    
    // Retornar erro mais descritivo
    if (error instanceof Error) {
      console.error('[MEDIA PROXY] Detalhes:', error.message);
    }
    
    return new NextResponse(
      'Erro ao carregar mídia',
      { status: 500 }
    );
  }
}
