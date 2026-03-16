/**
 * API Route: POST /api/conversations/create
 * Cria ou atualiza uma conversa e adiciona a mensagem
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiClient } from '@/libs/api';
import { getTlsFetchOptions } from '@/lib/serverTls';
import { Template, RenderedResponse } from '@/types/whatsapp';
import { ConversationRequest } from '@/types/conversation';
import { MessageRequest } from '@/types/message';
import { getMediaInfo, downloadMedia } from '@/libs/whatsapp';
import { uploadToBlob } from '@/libs/blob';
import { handleApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

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
                  logger.debug('RENDER', `Botão QUICK_REPLY - Template text: "${templateButton?.text}", Payload: "${payloadParam?.payload}"`);

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

                  logger.debug('RENDER', `Botão URL Card ${cardIdx}`, {
                    templateText: templateButton?.text,
                    urlBaseOriginal: urlBase,
                    dominioExtraido: domain,
                    sufixoEnviado: urlSuffix,
                    urlFinal: `${domain}${urlSuffix}`
                  });

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
 * Baixa uma mídia do WhatsApp e salva no Vercel Blob Storage (PRIVATE)
 */
async function downloadMediaToBlob(mediaId: string, type: 'image' | 'video' | 'document' = 'image'): Promise<string | null> {
  try {
    logger.info('MEDIA', `Processando mídia ${mediaId}...`);

    // 1. Buscar informações da mídia
    const mediaInfo = await getMediaInfo(mediaId);
    logger.debug('MEDIA', `Mídia encontrada: ${mediaInfo.mime_type}, ${mediaInfo.file_size} bytes`);

    // 2. Baixar mídia
    const buffer = await downloadMedia(mediaInfo.url);
    logger.debug('MEDIA', `Download concluído: ${buffer.length} bytes`);

    // 3. Upload para Blob
    const result = await uploadToBlob(mediaId, buffer, {
      type,
      contentType: mediaInfo.mime_type,
    });

    logger.info('MEDIA', `Upload para Blob concluído: ${result.proxyUrl}`);

    return result.proxyUrl;

  } catch (error) {
    logger.error('MEDIA', `Erro ao processar mídia ${mediaId}`, error);
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
    logger.debug('MEDIA', 'Nenhuma mídia para baixar');
    return;
  }

  logger.info('MEDIA', `Baixando ${mediaIds.length} mídia(s)...`);

  // Baixar todas as mídias em paralelo
  const downloadPromises = mediaIds.map(({ id, type }) => downloadMediaToBlob(id, type));
  await Promise.all(downloadPromises);

  logger.info('MEDIA', 'Download de mídias concluído');
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

    logger.info('API:CREATE', 'Template renderizado', renderedTemplate);

    // Baixar todas as mídias do template e salvar localmente
    logger.info('API:CREATE', 'Iniciando download de mídias...');
    try {
      await downloadMediaFromTemplate(renderedTemplate);
      logger.info('API:CREATE', 'Download de mídias finalizado com sucesso');
    } catch (mediaError) {
      logger.error('API:CREATE', 'Erro ao baixar mídias', mediaError);
      // Não falha o request se o download de mídia falhar
    }

    // Preparar opções TLS para requisições à API externa
    const convUrl = apiClient.getFullUrl('/api/v2/conversations');
    const tlsOpts = await getTlsFetchOptions(convUrl);

    // 1. Criar/atualizar a conversa (API faz upsert automaticamente)
    const conversationPayload: ConversationRequest = {
      phone,
      waId,
      state: 'initial',
      context: renderedTemplate, 
      initiatedBy: 'SYSTEM',
    };

    logger.info('API:CREATE', `Criando/atualizando conversa para waId: ${waId}`, conversationPayload);

    const convResponse = await apiClient.post<{ id: number } | number>(
      '/api/v2/conversations',
      conversationPayload,
      tlsOpts
    );

    logger.debug('API:CREATE', `Resposta da API (tipo: ${typeof convResponse})`, convResponse);

    const conversationId = convResponse as number;

    logger.info('API:CREATE', `Conversa ID extraído: ${conversationId}`);

    if (!conversationId) {
      throw new Error('Não foi possível obter o ID da conversa');
    }

    // 2. Adicionar a mensagem
    if (bodyText) {
      const msgUrl = apiClient.getFullUrl('/api/v2/messages');
      const msgTlsOpts = await getTlsFetchOptions(msgUrl);

      const messagePayload: MessageRequest = {
        conversationId,
        channel: 'whatsapp',
        content: bodyText,
        origin: 'Oferta',
      };

      logger.info('API:CREATE', 'Criando mensagem', messagePayload);

      try {
        const msgResponse = await apiClient.post('/api/v2/messages', messagePayload, msgTlsOpts);
        logger.info('API:CREATE', `Mensagem adicionada à conversa ${conversationId}`, msgResponse);
      } catch (msgError) {
        logger.error('API:CREATE', 'Erro ao criar mensagem', msgError);
      }
    }

    return NextResponse.json({
      success: true,
      conversationId,
      message: 'Conversa e mensagem criadas/atualizadas com sucesso',
    });

  } catch (error) {
    logger.error('API:CREATE', 'Erro geral', error);
    return handleApiError(error);
  }
}
