import { NextResponse } from 'next/server';

type Template = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: unknown[];
  [key: string]: unknown;
};

type WhatsAppResponse = {
  data: Template[];
  paging?: {
    next?: string;
    cursors?: {
      before?: string;
      after?: string;
    };
  };
};

export async function GET() {
  const version = process.env.WHATSAPP_API_VERSION || 'v24.0';
  const businessId = process.env.WHATSAPP_BUSINESS_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!businessId || !token) {
    return NextResponse.json({ error: 'WhatsApp credentials not configured' }, { status: 500 });
  }

  try {
    let allTemplates: Template[] = [];
    let nextUrl: string | undefined = `https://graph.facebook.com/${version}/${businessId}/message_templates`;

    // Buscar todas as páginas
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return new NextResponse(txt || 'WhatsApp API error', { status: res.status });
      }

      const data: WhatsAppResponse = await res.json();
      
      // Adicionar templates desta página
      allTemplates = allTemplates.concat(data.data || []);
      
      // Verificar se há próxima página
      nextUrl = data.paging?.next;
      
      // Limite de segurança (máximo 2500 templates = ~100 páginas)
      if (allTemplates.length > 2500) {
        console.warn('Limite de 2500 templates atingido, parando paginação');
        break;
      }
    }

    return NextResponse.json({ data: allTemplates });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
