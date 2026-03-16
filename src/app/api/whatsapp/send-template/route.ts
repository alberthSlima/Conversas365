import { NextResponse } from 'next/server';
import { getGraphBaseUrl, getAuthHeaders, getWhatsAppConfig } from '@/libs/whatsapp';
import { handleApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export async function POST(req: Request) {
  try {
    const config = getWhatsAppConfig();
    const body = await req.json();
    
    logger.debug('WHATSAPP:SEND', 'Received payload', body);

    if (!body.to || typeof body.to !== 'string') {
      return NextResponse.json({ error: 'Campo "to" é obrigatório e deve ser uma string com o número' }, { status: 400 });
    }
    if (!body.template?.name) {
      return NextResponse.json({ error: 'Nome do template é obrigatório' }, { status: 400 });
    }

    const url = `${getGraphBaseUrl()}/${config.phoneNumberId}/messages`;
    logger.debug('WHATSAPP:SEND', `URL: ${url}`);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(config.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    logger.info('WHATSAPP:SEND', `Response Status: ${res.status}`, responseText);

    if (!res.ok) {
      return new NextResponse(responseText || 'WhatsApp API error', { status: res.status });
    }

    const data: unknown = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
