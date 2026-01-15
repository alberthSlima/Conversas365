import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const version = process.env.WHATSAPP_API_VERSION || 'v24.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    return NextResponse.json({ error: 'WhatsApp credentials not configured (WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN required)' }, { status: 500 });
  }

  try {
    const body = await req.json();
    
    console.log('[API SEND] Received payload:', JSON.stringify(body, null, 2));
    
    // Validação básica
    if (!body.to || typeof body.to !== 'string') {
      return NextResponse.json({ error: 'Campo "to" é obrigatório e deve ser uma string com o número' }, { status: 400 });
    }
    if (!body.template?.name) {
      return NextResponse.json({ error: 'Nome do template é obrigatório' }, { status: 400 });
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    console.log('[API SEND] URL:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    console.log('[API SEND] WhatsApp Response Status:', res.status);
    console.log('[API SEND] WhatsApp Response:', responseText);

    if (!res.ok) {
      return new NextResponse(responseText || 'WhatsApp API error', { status: res.status });
    }

    const data: unknown = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
