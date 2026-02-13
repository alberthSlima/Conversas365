import { NextRequest, NextResponse } from 'next/server';
import { requireToken, graphBaseUrl, authHeaders } from '@/lib/whatsapp';

/**
 * GET /api/whatsapp/media/[id]
 * Obtém a mídia do WhatsApp pelo ID: consulta o Graph API e faz proxy do arquivo
 * (a URL retornada pelo Graph exige token, então o front não acessa direto).
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let token: string;
  try {
    ({ token } = requireToken());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'WHATSAPP_ACCESS_TOKEN não configurado' },
      { status: 500 }
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: 'ID da mídia é obrigatório' }, { status: 400 });
  }

  try {
    const metaUrl = `${graphBaseUrl()}/${id.trim()}`;
    const metaRes = await fetch(metaUrl, {
      headers: authHeaders(token),
      cache: 'no-store',
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      console.error('[API MEDIA GET] Meta response:', metaRes.status, errText);
      return NextResponse.json(
        { error: errText || 'Mídia não encontrada' },
        { status: metaRes.status }
      );
    }

    const meta = (await metaRes.json()) as {
      url?: string;
      mime_type?: string;
      id?: string;
    };

    if (!meta.url) {
      return NextResponse.json(
        { error: 'Resposta da API sem URL da mídia' },
        { status: 502 }
      );
    }

    const fileRes = await fetch(meta.url, {
      headers: authHeaders(token),
      cache: 'no-store',
    });

    if (!fileRes.ok) {
      console.error('[API MEDIA GET] Lookaside response:', fileRes.status);
      return NextResponse.json(
        { error: 'Falha ao baixar arquivo da mídia' },
        { status: 502 }
      );
    }

    const blob = await fileRes.arrayBuffer();
    const mimeType = meta.mime_type || 'image/jpeg';

    return new NextResponse(blob, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[API MEDIA GET]', e);
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
