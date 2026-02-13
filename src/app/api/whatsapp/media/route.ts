import { NextResponse } from 'next/server';
import { requirePhoneNumberId, graphBaseUrl, authHeaders } from '@/lib/whatsapp';

/**
 * POST /api/whatsapp/media
 * Recebe multipart/form-data (file, type, messaging_product) e envia para
 * Graph API para obter o ID da mídia (usado em templates, ex.: header de card).
 */
export async function POST(req: Request) {
  let config: ReturnType<typeof requirePhoneNumberId>;
  try {
    config = requirePhoneNumberId();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Credenciais WhatsApp não configuradas' },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const type = (formData.get('type') as string) || 'image/jpeg';
    const messagingProduct = (formData.get('messaging_product') as string) || 'whatsapp';

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Campo "file" é obrigatório e deve ser um arquivo de imagem' },
        { status: 400 }
      );
    }

    const body = new FormData();
    body.append('file', file as Blob);
    body.append('type', type);
    body.append('messaging_product', messagingProduct);

    const url = `${graphBaseUrl()}/${config.phoneNumberId}/media`;
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(config.token),
      body,
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error('[API MEDIA] WhatsApp Response:', responseText);
      return NextResponse.json(
        { error: responseText || 'Erro ao enviar mídia para WhatsApp' },
        { status: res.status }
      );
    }

    const data = JSON.parse(responseText) as { id?: string };
    if (!data.id) {
      return NextResponse.json(
        { error: 'Resposta da API sem id' },
        { status: 502 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[API MEDIA]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
