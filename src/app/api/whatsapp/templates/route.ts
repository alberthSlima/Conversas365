import { NextResponse } from 'next/server';
import { requireBusinessId, graphBaseUrl, authHeaders } from '@/lib/whatsapp';

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
    cursors?: { before?: string; after?: string };
  };
};

export async function GET() {
  let config: ReturnType<typeof requireBusinessId>;
  try {
    config = requireBusinessId();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'WhatsApp credentials not configured' },
      { status: 500 }
    );
  }

  try {
    let allTemplates: Template[] = [];
    let nextUrl: string | undefined = `${graphBaseUrl()}/${config.businessId}/message_templates`;

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          ...authHeaders(config.token),
          Accept: 'application/json',
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
