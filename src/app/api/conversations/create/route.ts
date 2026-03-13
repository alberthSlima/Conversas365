/**
 * API Route: POST /api/conversations/create
 * Cria ou atualiza uma conversa e adiciona a mensagem
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiClient } from '@/infrastructure/http/ApiClient';
import { getTlsFetchOptions } from '@/lib/serverTls';
import { Template, RenderedResponse } from '@/types/template';
import { graphBaseUrl, authHeaders, requireToken } from '@/lib/whatsapp';

/**
 * Renderiza o template aplicando os parâmetros, igual ao C# RenderTemplateAsync
 */
function renderTemplate(template: Template, sentComponents: Array<Record<string, unknown>>): RenderedResponse {
  const rendered: RenderedResponse = { Components: [] };

  const templateComponents = template.components || [];
  
  // Mapeia os componentes enviados por tipo
  const sentComponentsMap = new Map<string, Record<string, unknown>>();
  sentComponents.forEach((comp) => {
    const type = (comp.type as string || '').toLowerCase();
    sentComponentsMap.set(type, comp);
  });

  templateComponents.forEach((component) => {
    const compType = component.type.toUpperCase();
    const sentComp = sentComponentsMap.get(compType.toLowerCase());
    
    // Pega os parâmetros enviados
    const sentParams = (sentComp?.parameters as Array<Record<string, unknown>>) || [];

    switch (compType) {
      case 'BODY':
      case 'FOOTER':
        {
          const paramTexts = sentParams
            .filter(p => p.type === 'text')
            .map(p => p.text as string);
            
          let text = component.text || '';
          
          // Aplicar parâmetros no texto (substituir {{1}}, {{2}}, etc)
          paramTexts.forEach((paramText, idx) => {
            text = text.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), paramText);
          });

          rendered.Components.push({
            Type: compType.toLowerCase(),
            Text: text,
            Parameters: paramTexts.map(t => ({ Type: 'text', Text: t })),
          });
        }
        break;

      case 'HEADER':
        {
          // HEADER pode ter texto ou mídia (imagem, vídeo, documento)
          const format = (component.format || '').toUpperCase();
          
          if (format === 'TEXT') {
          
            // Header com texto
            const paramTexts = sentParams
              .filter(p => p.type === 'text')
              .map(p => p.text as string);
              
            let text = component.text || '';
            paramTexts.forEach((paramText, idx) => {
              text = text.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), paramText);
            });

            rendered.Components.push({
              Type: 'header',
              SubType: format,
              Text: text,
              Parameters: paramTexts.map(t => ({ Type: 'text', Text: t })),
            });
            
          } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
            // Header com mídia
            const mediaParam = sentParams[0];
            if (mediaParam) {
              const parameters = [];
              
              if (mediaParam.type === 'image' && mediaParam.image) {
                parameters.push({
                  Type: 'image',
                  Text: (mediaParam.image as Record<string, unknown>).id as string || '',
                });
              } else if (mediaParam.type === 'video' && mediaParam.video) {
                parameters.push({
                  Type: 'video',
                  Text: (mediaParam.video as Record<string, unknown>).id as string || '',
                });
              } else if (mediaParam.type === 'document' && mediaParam.document) {
                parameters.push({
                  Type: 'document',
                  Text: (mediaParam.document as Record<string, unknown>).id as string || '',
                });
              }

              rendered.Components.push({
                Type: 'header',
                SubType: format,
                Text: '',
                Parameters: parameters,
              });
            }
          }
        }
        break;

      case 'BUTTONS':
        {
          const buttons = component.buttons || [];
          buttons.forEach((btn, i) => {
            rendered.Components.push({
              Type: 'button',
              SubType: btn.type.toUpperCase(),
              Text: btn.text,
              Url: (btn as { url?: string }).url,
              Index: i,
              Parameters: null,
            });
          });
        }
        break;

      case 'CAROUSEL':
        {
          // Processar cards do carousel
          const sentCarousel = sentComp as Record<string, unknown>;
          const sentCards = (sentCarousel?.cards as Array<Record<string, unknown>>) || [];
          
          // Pega o componente carousel do template original
          const carouselComponent = templateComponents.find(c => (c.type || '').toUpperCase() === 'CAROUSEL');
          const templateCards = (carouselComponent as { cards?: Array<{ components?: Array<{ type?: string; buttons?: Array<{ type?: string; text?: string; url?: string }> }> }> })?.cards || [];
          
          sentCards.forEach((sentCard, cardIdx) => {
            const cardComponents = (sentCard.components as Array<Record<string, unknown>>) || [];
            const templateCard = templateCards[cardIdx];
            
            cardComponents.forEach((cardComp) => {
              const cardCompType = (cardComp.type as string || '').toUpperCase();
              const cardParams = (cardComp.parameters as Array<Record<string, unknown>>) || [];
              
              if (cardCompType === 'HEADER') {
                // Header de imagem no carousel
                const imageParam = cardParams.find(p => p.type === 'image');
                if (imageParam && imageParam.image) {
                  rendered.Components.push({
                    Type: 'header',
                    SubType: 'IMAGE',
                    Text: '',
                    Parameters: [{
                      Type: 'image',
                      Text: (imageParam.image as Record<string, unknown>).id as string || '',
                    }],
                  });
                }
              } else if (cardCompType === 'BUTTON') {
                // Botões do carousel
                const subType = (cardComp.sub_type as string || '').toUpperCase();
                const index = (cardComp.index as string) || '0';
                const btnIdx = parseInt(index, 10);
                
                // Pega o botão original do template para ter a URL base
                const templateButtonsComp = templateCard?.components?.find(c => (c.type || '').toLowerCase() === 'buttons');
                const templateButton = templateButtonsComp?.buttons?.[btnIdx];
                
                if (subType === 'QUICK_REPLY') {
                  const payloadParam = cardParams.find(p => p.type === 'payload');
                  console.log(`[RENDER] Botão QUICK_REPLY - Template text: "${templateButton?.text}", Payload: "${payloadParam?.payload}"`);
                  
                  rendered.Components.push({
                    Type: 'button',
                    SubType: 'QUICK_REPLY',
                    Text: templateButton?.text || (payloadParam?.payload as string) || '', // Texto do template
                    Index: rendered.Components.filter(c => c.Type === 'button').length,
                    Parameters: null,
                  });
                } else if (subType === 'URL') {
                  const textParam = cardParams.find(p => p.type === 'text');
                  const urlSuffix = (textParam?.text as string) || '';
                  const urlBase = templateButton?.url || '';
                  
                  // Extrair apenas o domínio da URL base (sem path)
                  let domain = urlBase;
                  try {
                    const url = new URL(urlBase);
                    domain = `${url.protocol}//${url.host}`; // Ex: https://www.medeiros365.com.br
                  } catch {
                    domain = urlBase;
                  }
                  
                  console.log(`[RENDER] Botão URL Card ${cardIdx}:`);
                  console.log(`  - Template text: "${templateButton?.text}"`);
                  console.log(`  - URL base original: "${urlBase}"`);
                  console.log(`  - Domínio extraído: "${domain}"`);
                  console.log(`  - Sufixo enviado: "${urlSuffix}"`);
                  console.log(`  - URL final: "${domain}${urlSuffix}"`);
                  
                  rendered.Components.push({
                    Type: 'button',
                    SubType: 'URL',
                    Text: templateButton?.text || '', // Texto do botão vem do template
                    Url: domain + urlSuffix, // Domínio do template + sufixo enviado
                    Index: rendered.Components.filter(c => c.Type === 'button').length,
                    Parameters: null,
                  });
                }
              }
            });
          });
        }
        break;
    }
  });

  return rendered;
}

/**
 * Baixa uma mídia do WhatsApp
 * - Em desenvolvimento: salva localmente
 * - Em produção (Vercel): salva no Vercel Blob Storage
 */
async function downloadMedia(mediaId: string, type: 'image' | 'video' | 'document' = 'image'): Promise<string | null> {
  try {
    const isVercel = process.env.VERCEL === '1';

    // Usar funções do whatsapp.ts para autenticação
    const { token } = requireToken();
    const baseUrl = graphBaseUrl();

    console.log(`[MEDIA] Buscando informações da mídia ${mediaId}...`);
    
    // 1. Buscar URL da mídia com timeout
    const mediaInfoResponse = await fetch(
      `${baseUrl}/${mediaId}`,
      {
        headers: authHeaders(token),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!mediaInfoResponse.ok) {
      console.error(`[MEDIA] Erro ao buscar informações da mídia: ${mediaInfoResponse.status}`);
      const errorText = await mediaInfoResponse.text();
      console.error(`[MEDIA] Resposta de erro:`, errorText);
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json() as { url?: string; mime_type?: string };
    const mediaUrl = mediaInfo.url;

    if (!mediaUrl) {
      console.error('[MEDIA] URL da mídia não encontrada na resposta');
      return null;
    }

    console.log(`[MEDIA] Baixando mídia de: ${mediaUrl}`);

    // 2. Baixar o arquivo com timeout aumentado
    const downloadResponse = await fetch(mediaUrl, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(30000), // 30 segundos de timeout
    });

    if (!downloadResponse.ok) {
      console.error(`[MEDIA] Erro ao baixar mídia: ${downloadResponse.status}`);
      return null;
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Salvar conforme ambiente
    if (isVercel) {
      // PRODUÇÃO: Salvar no Vercel Blob Storage (PRIVATE)
      // Validar se o token do Blob está configurado
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('[MEDIA] BLOB_READ_WRITE_TOKEN não configurado');
        return null;
      }

      console.log(`[MEDIA] Salvando no Vercel Blob (PRIVATE): ${mediaId}`);
      
      const { put } = await import('@vercel/blob');
      const extension = type === 'video' ? 'mp4' : type === 'document' ? 'pdf' : 'jpg';
      const filename = `whatsapp/${mediaId}.${extension}`;
      
      const blob = await put(filename, buffer, {
        access: 'public', // SDK usa 'public' mas o store sendo private garante segurança
        contentType: mediaInfo.mime_type || 'image/jpeg',
        addRandomSuffix: false,
      });

      console.log(`[MEDIA] Mídia salva no Blob privado: ${blob.url}`);
      
      // Retorna path da API proxy ao invés da URL direta do blob
      const proxyUrl = `/api/media/proxy/${mediaId}.${extension}`;
      return proxyUrl;
      
    } else {
      // DESENVOLVIMENTO: Salvar localmente
      const { writeFile, mkdir } = await import('fs/promises');
      const { existsSync } = await import('fs');
      const path = await import('path');

      const mediaDir = path.join(process.cwd(), 'public', 'media', 'whatsapp');
      const extension = type === 'video' ? 'mp4' : type === 'document' ? 'pdf' : 'jpg';
      const filename = `${mediaId}.${extension}`;
      const localPath = path.join(mediaDir, filename);
      const publicUrl = `/media/whatsapp/${filename}`;

      // Verificar se já existe
      if (existsSync(localPath)) {
        console.log(`[MEDIA] Mídia já existe localmente: ${publicUrl}`);
        return publicUrl;
      }

      // Garantir que o diretório existe
      if (!existsSync(mediaDir)) {
        await mkdir(mediaDir, { recursive: true });
      }

      // Salvar o arquivo
      await writeFile(localPath, buffer);

      console.log(`[MEDIA] Mídia salva em: ${localPath} (${buffer.length} bytes)`);

      return publicUrl;
    }
  } catch (error) {
    console.error(`[MEDIA] Erro ao baixar mídia ${mediaId}:`, error);
    return null;
  }
}

/**
 * Baixa todas as mídias de um template renderizado
 */
async function downloadMediaFromTemplate(renderedTemplate: RenderedResponse): Promise<void> {
  const mediaIds: Array<{ id: string; type: 'image' | 'video' | 'document' }> = [];

  // Coletar todos os IDs de mídia
  for (const comp of renderedTemplate.Components) {
    if (comp.Type === 'header' && comp.SubType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(comp.SubType)) {
      if (Array.isArray(comp.Parameters)) {
        for (const param of comp.Parameters) {
          if (param.Text && param.Type && ['image', 'video', 'document'].includes(param.Type.toLowerCase())) {
            mediaIds.push({
              id: param.Text,
              type: param.Type.toLowerCase() as 'image' | 'video' | 'document',
            });
          }
        }
      }
    }
  }

  if (mediaIds.length === 0) {
    console.log('[MEDIA] Nenhuma mídia para baixar');
    return;
  }

  console.log(`[MEDIA] Baixando ${mediaIds.length} mídia(s)...`);

  // Baixar todas as mídias em paralelo
  const downloadPromises = mediaIds.map(({ id, type }) => downloadMedia(id, type));
  await Promise.all(downloadPromises);

  console.log('[MEDIA] Download de mídias concluído');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, waId, templateName, bodyText, templatePayload, templateStructure } = body;

    if (!phone || !waId || !templateName) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: phone, waId, templateName' },
        { status: 400 }
      );
    }

    const apiClient = new ApiClient();

    const sentComponents = (templatePayload.template as Record<string, unknown>)?.components as Array<Record<string, unknown>>;
    const renderedTemplate = templateStructure 
      ? renderTemplate(templateStructure as Template, sentComponents || [])
      : { Components: [] };
      
    console.log(`[API /conversations/create] Template renderizado:`, JSON.stringify(renderedTemplate, null, 2));

    // Baixar todas as mídias do template e salvar localmente
    console.log(`[API /conversations/create] Iniciando download de mídias...`);
    try {
      await downloadMediaFromTemplate(renderedTemplate);
      console.log(`[API /conversations/create] Download de mídias finalizado com sucesso`);
    } catch (mediaError) {
      console.error(`[API /conversations/create] Erro ao baixar mídias:`, mediaError);
      // Não falha o request se o download de mídia falhar
    }

    // Preparar opções TLS para requisições à API externa
    const convUrl = apiClient.getFullUrl('/api/v2/conversations');
    const tlsOpts = await getTlsFetchOptions(convUrl);

    // 1. Criar/atualizar a conversa (API faz upsert automaticamente)
    const conversationPayload = {
      phone,
      waId,
      state: 'initial',
      context: renderedTemplate, 
      initiatedBy: 'SYSTEM'
    };

    console.log(`[API /conversations/create] Criando/atualizando conversa para waId: ${waId}`);
    console.log(`[API /conversations/create] Payload:`, JSON.stringify(conversationPayload, null, 2));

    const convResponse = await apiClient.post<{ id: number } | number>(
      '/api/v2/conversations',
      conversationPayload,
      tlsOpts
    );

    console.log(`[API /conversations/create] Resposta da API (tipo: ${typeof convResponse}):`, JSON.stringify(convResponse, null, 2));
    
    const conversationId = convResponse as number;
    
    console.log(`[API /conversations/create] Conversa ID extraído: ${conversationId}`);

    if (!conversationId) {
      throw new Error('Não foi possível obter o ID da conversa');
    }

    // 2. Adicionar a mensagem
    if (bodyText) {
      const msgUrl = apiClient.getFullUrl('/api/v2/messages');
      const msgTlsOpts = await getTlsFetchOptions(msgUrl);

      const messagePayload = {
        conversationId,
        channel: 'whatsapp',
        content: bodyText,
        origin: 'Oferta',
      };

      console.log(`[API /conversations/create] Criando mensagem:`, JSON.stringify(messagePayload, null, 2));
      
      try {
        const msgResponse = await apiClient.post('/api/v2/messages', messagePayload, msgTlsOpts);
        console.log(`[API /conversations/create] Mensagem adicionada à conversa ${conversationId}`);
        console.log(`[API /conversations/create] Resposta da mensagem:`, JSON.stringify(msgResponse, null, 2));
      } catch (msgError) {
        console.error(`[API /conversations/create] Erro ao criar mensagem:`, msgError);
        // Não vamos lançar o erro, apenas logamos
      }
    }

    return NextResponse.json({
      success: true,
      conversationId,
      message: 'Conversa e mensagem criadas/atualizadas com sucesso',
    });

  } catch (error) {
    console.error('[API /conversations/create] Erro:', error);
    if (error instanceof Error) {
      console.error('[API /conversations/create] Stack:', error.stack);
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao criar conversa',
      },
      { status: 500 }
    );
  }
}
