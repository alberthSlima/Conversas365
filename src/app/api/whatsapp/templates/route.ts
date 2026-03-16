import { NextResponse } from 'next/server';
import { getGraphBaseUrl, getAuthHeaders, getWhatsAppConfig } from '@/libs/whatsapp';
import { handleApiError } from '@/utils/errors';
import { Template, Templates } from '@/types/whatsapp';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const config = getWhatsAppConfig();
    let allTemplates: Template[] = [];
    let nextUrl: string | undefined = `${getGraphBaseUrl()}/${config.businessId}/message_templates`;

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          ...getAuthHeaders(config.token),
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return new NextResponse(txt || 'WhatsApp API error', { status: res.status });
      }

      const data: Templates = await res.json();
      
      // Adicionar templates desta página
      allTemplates = allTemplates.concat(data.data || []);
      
      // Verificar se há próxima página
      nextUrl = data.paging?.next;
      
      // Limite de segurança (máximo 2500 templates = ~100 páginas)
      if (allTemplates.length > 2500) {
        logger.warn('WHATSAPP:TEMPLATES', 'Limite de 2500 templates atingido, parando paginação');
        break;
      }
    }

    return NextResponse.json({ data: allTemplates });
  } catch (error) {
    return handleApiError(error);
  }
}
