"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as XLSX from 'xlsx';
import Header from "@/components/Header";

type CarouselCardComponent = {
  type: string;
  format?: string;
  example?: { header_handle?: string[] };
  buttons?: Array<{ type: string; text: string; url?: string; example?: string[] }>;
};

type Component = {
  type: string;
  text?: string;
  format?: string;
  buttons?: Array<{ type: string; text: string; url?: string; example?: string[] }>;
  example?: {
    body_text?: string[][];
    header_handle?: string[];
  };
  /** Carrossel: quando type é CAROUSEL ou carousel, contém os cards */
  cards?: Array<{ components: CarouselCardComponent[] }>;
};

type Template = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Component[];
  previous_category?: string;
  parameter_format?: string;
};

export default function TemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSendForm, setShowSendForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [phones, setPhones] = useState<string>('');
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState<string[][]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  /** ID da mídia por card (header image) após upload - chave = cardIdx */
  const [carouselHeaderImageIds, setCarouselHeaderImageIds] = useState<Record<number, string>>({});
  /** URL de preview (blob) da imagem do card para exibir no preview em vez do ID */
  const [carouselHeaderPreviewUrls, setCarouselHeaderPreviewUrls] = useState<Record<number, string>>({});
  const [carouselUploadingCard, setCarouselUploadingCard] = useState<number | null>(null);
  const [pendingCarouselUploadCard, setPendingCarouselUploadCard] = useState<number | null>(null);
  const carouselFileInputRef = useRef<HTMLInputElement>(null);

  /** Estado para preview em tempo real */
  const [previewBodyParams, setPreviewBodyParams] = useState<string[]>([]);
  const [previewButtonParams, setPreviewButtonParams] = useState<Record<number, string>>({});
  const [previewCarouselPayload, setPreviewCarouselPayload] = useState<Record<string, string>>({});
  const [previewCarouselText, setPreviewCarouselText] = useState<Record<string, string>>({});

  function openCarouselFilePicker(cardIdx: number) {
    setPendingCarouselUploadCard(cardIdx);
    carouselFileInputRef.current?.click();
  }

  async function handleCarouselHeaderUpload(cardIdx: number, file: File) {
    setCarouselUploadingCard(cardIdx);
    const previewUrl = URL.createObjectURL(file);
    setCarouselHeaderPreviewUrls((prev) => {
      const old = prev[cardIdx];
      if (old) URL.revokeObjectURL(old);
      return { ...prev, [cardIdx]: previewUrl };
    });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', file.type || 'image/jpeg');
      formData.append('messaging_product', 'whatsapp');
      const res = await fetch('/api/whatsapp/media', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const data = await res.json();
      if (data.id) {
        setCarouselHeaderImageIds((prev) => ({ ...prev, [cardIdx]: data.id }));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao enviar imagem');
      URL.revokeObjectURL(previewUrl);
      setCarouselHeaderPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[cardIdx];
        return next;
      });
    } finally {
      setCarouselUploadingCard(null);
      setPendingCarouselUploadCard(null);
      if (carouselFileInputRef.current) carouselFileInputRef.current.value = '';
    }
  }

  function onCarouselFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const cardIdx = pendingCarouselUploadCard;
    if (file && cardIdx !== null) {
      handleCarouselHeaderUpload(cardIdx, file);
    }
  }

  useEffect(() => {
    async function fetchTemplate() {
      try {
        setLoading(true);
        const res = await fetch('/api/whatsapp/templates', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Erro ao buscar templates: ${res.status}`);
        }
        const json = await res.json();
        if (json.error) {
          throw new Error(json.error);
        }
        const found = (json.data || []).find((t: Template) => t.id === templateId);
        if (!found) {
          throw new Error('Template não encontrado');
        }
        setTemplate(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [templateId]);

  // Inicializar preview body params quando o template carregar
  useEffect(() => {
    if (!template?.components) return;
    const bodyComp = template.components.find((c) => (c.type || '').toUpperCase() === 'BODY');
    const len = bodyComp?.example?.body_text?.[0]?.length ?? 0;
    if (len > 0) setPreviewBodyParams((prev) => (prev.length !== len ? Array(len).fill('') : prev));
  }, [template]);

  // Limpar URLs de preview das imagens ao fechar o formulário (evita vazar memória e URLs revogadas)
  useEffect(() => {
    if (!showSendForm) {
      setCarouselHeaderPreviewUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
    }
  }, [showSendForm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <div className="animate-spin w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Carregando template...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-lg font-semibold">Erro ao carregar template</p>
              <p className="text-gray-500 mt-2">{error || 'Template não encontrado'}</p>
              <button 
                onClick={() => router.back()} 
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold"
              >
                ← Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          alert('Planilha vazia ou sem dados');
          return;
        }

        // Primeira linha = cabeçalhos
        const headers = (jsonData[0] as string[]).map((h, i) => h || `Coluna ${i + 1}`);
        setColumns(headers);
        setSpreadsheetData(jsonData as string[][]);
        setShowColumnSelect(true);
      } catch (err) {
        alert('Erro ao ler planilha: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleColumnSelect(columnIndex: number) {
    const phoneNumbers: string[] = [];
    
    // Pegar dados a partir da linha 1 (pula o cabeçalho)
    for (let i = 1; i < spreadsheetData.length; i++) {
      const value = spreadsheetData[i][columnIndex];
      if (value) {
        // Limpar e formatar número
        const cleanPhone = String(value).replace(/\D/g, '');
        if (cleanPhone) {
          phoneNumbers.push(cleanPhone);
        }
      }
    }

    setPhones(phoneNumbers.join(', '));
    setShowColumnSelect(false);
    setSpreadsheetData([]);
    setColumns([]);
  }

  async function handleSendTemplate(formData: FormData) {
    if (!template) return;
    
    try {
      setSending(true);
      setSendResult(null);
      
      const phones = formData.get('phones') as string;
      const phoneArray = phones.split(',').map(p => p.trim()).filter(Boolean);
      
      if (phoneArray.length === 0) {
        setSendResult('❌ Erro: Informe pelo menos um número de telefone');
        return;
      }

      // Montar componentes com parâmetros (body, buttons, carousel)
      type PayloadComponent =
        | { type: 'body'; parameters: Array<{ type: string; text: string }> }
        | { type: 'button'; sub_type: string; index: string; parameters: Array<{ type: string; text?: string; payload?: string }> }
        | {
            type: 'carousel';
            cards: Array<{
              card_index: number;
              components: Array<
                | { type: 'header'; parameters: Array<{ type: string; image?: { id?: string; link?: string } }> }
                | { type: 'button'; sub_type: string; index: string; parameters: Array<{ type: string; text?: string; payload?: string }> }
              >;
            }>;
          };

      const components: PayloadComponent[] = [];

      template.components?.forEach((comp) => {
        const compType = (comp.type || '').toUpperCase();
        if (compType === 'BODY' && comp.example?.body_text && comp.example.body_text.length > 0) {
          const params = comp.example.body_text[0].map((_, i) => {
            const val = formData.get(`body_${i}`) as string;
            return { type: 'text', text: val || '' };
          });
          components.push({ type: 'body', parameters: params });
        }

        if (compType === 'BUTTONS' && comp.buttons) {
          comp.buttons.forEach((btn, btnIdx) => {
            if (btn.type === 'URL') {
              const val = formData.get(`button_${btnIdx}`) as string;
              if (val) {
                components.push({
                  type: 'button',
                  sub_type: 'url',
                  index: String(btnIdx),
                  parameters: [{ type: 'text', text: val }],
                });
              }
            }
          });
        }

        // Carrossel: cards vêm dinamicamente do JSON da API
        if ((compType === 'CAROUSEL' || comp.type === 'carousel') && comp.cards?.length) {
          type CarouselCardPayload = {
            card_index: number;
            components: Array<
              | { type: 'header'; parameters: Array<{ type: string; image?: { id?: string; link?: string } }> }
              | { type: 'button'; sub_type: string; index: string; parameters: Array<{ type: string; text?: string; payload?: string }> }
            >;
          };
          const carouselCards: CarouselCardPayload[] = comp.cards.map((card, cardIdx) => {
            const cardComponents: CarouselCardPayload['components'] = [];
            card.components?.forEach((c) => {
              const cType = (c.type || '').toLowerCase();
              if (cType === 'header' && (c.format || '').toLowerCase() === 'image') {
                const imageVal = (formData.get(`carousel_card_${cardIdx}_header_image`) as string)?.trim();
                if (imageVal) {
                  cardComponents.push({
                    type: 'header',
                    parameters: [{ type: 'image', image: { id: imageVal } }],
                  });
                }
              }
              if (cType === 'buttons' && c.buttons) {
                c.buttons.forEach((btn, btnIdx) => {
                  const btnType = (btn.type || '').toUpperCase();
                  if (btnType === 'QUICK_REPLY') {
                    const payload = formData.get(`carousel_card_${cardIdx}_button_${btnIdx}_payload`) as string;
                    if (payload != null) {
                      cardComponents.push({
                        type: 'button',
                        sub_type: 'quick_reply',
                        index: String(btnIdx),
                        parameters: [{ type: 'payload', payload: String(payload) }],
                      });
                    }
                  }
                  if (btnType === 'URL') {
                    const text = formData.get(`carousel_card_${cardIdx}_button_${btnIdx}_text`) as string;
                    if (text != null) {
                      cardComponents.push({
                        type: 'button',
                        sub_type: 'url',
                        index: String(btnIdx),
                        parameters: [{ type: 'text', text: String(text) }],
                      });
                    }
                  }
                });
              }
            });
            return { card_index: cardIdx, components: cardComponents };
          });
          components.push({ type: 'carousel', cards: carouselCards });
        }
      });

      // Enviar para cada número separadamente
      const results: string[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const phone of phoneArray) {
        try {
          const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: template.name,
              language: { code: template.language },
              components,
            },
          };

          console.log('[SEND] Payload:', JSON.stringify(payload, null, 2));

          const res = await fetch('/api/whatsapp/send-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const txt = await res.text();
            console.error('[SEND ERROR]', txt);
            throw new Error(txt || `Erro ${res.status}`);
          }

          const responseData = await res.json();
          console.log('[SEND RESPONSE]', responseData);

          // Verificar se a mensagem foi aceita pelo WhatsApp
          if (responseData.messages && responseData.messages[0]?.message_status === 'accepted') {
            const messageId = responseData.messages[0].id;
            results.push(`✅ ${phone}: Enviado (ID: ${messageId})`);
            successCount++;
          } else {
            throw new Error('Mensagem não aceita pelo WhatsApp');
          }
        } catch (e) {
          results.push(`❌ ${phone}: ${e instanceof Error ? e.message : 'Erro'}`);
          errorCount++;
        }
      }

      const summary = `${successCount} enviado(s), ${errorCount} erro(s):\n${results.join('\n')}`;
      setSendResult(summary);
      
      if (errorCount === 0) {
        setTimeout(() => setShowSendForm(false), 2000);
      }
    } catch (e) {
      setSendResult(`❌ Erro: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => router.back()} 
          className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </button>

        {sendResult && (
          <div className="mb-6 animate-fadeIn">
            {sendResult.includes('✅') && !sendResult.includes('❌') ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-green-900 font-semibold mb-1">Enviado com sucesso!</h4>
                    <p className="text-green-800 text-sm whitespace-pre-wrap">{sendResult}</p>
                  </div>
                </div>
              </div>
            ) : sendResult.includes('❌') ? (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-amber-900 font-semibold mb-1">Atenção - Alguns envios falharam</h4>
                    <p className="text-amber-800 text-sm whitespace-pre-wrap">{sendResult}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-red-900 font-semibold mb-1">Erro no envio</h4>
                    <p className="text-red-800 text-sm whitespace-pre-wrap">{sendResult}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Modal de Seleção de Coluna */}
      {showColumnSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
              <h3 className="text-xl font-bold text-white mb-2">📊 Selecione a coluna com os telefones</h3>
              <p className="text-blue-100 text-sm">
                {spreadsheetData.length - 1} linha(s) encontrada(s) na planilha
              </p>
            </div>
            
            <div className="p-6 overflow-auto flex-1">
              <div className="grid gap-3">
                {columns.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleColumnSelect(idx)}
                    className="group p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                        <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {col}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 truncate">
                          Exemplo: <span className="font-medium">{spreadsheetData[1]?.[idx] || '(vazio)'}</span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => {
                  setShowColumnSelect(false);
                  setSpreadsheetData([]);
                  setColumns([]);
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 sm:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{template.name}</h1>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  ID: {template.id}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {template.language}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  {template.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    template.status === 'APPROVED'
                      ? 'bg-green-500 text-white'
                      : template.status === 'REJECTED'
                      ? 'bg-red-500 text-white'
                      : 'bg-yellow-500 text-white'
                  }`}
                >
                  {template.status === 'APPROVED' ? '✓' : template.status === 'REJECTED' ? '✗' : '●'} {template.status}
                </span>
              </div>
            </div>
            {template.status === 'APPROVED' && (
              <button
                onClick={() => setShowSendForm(!showSendForm)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {showSendForm ? 'Fechar Formulário' : 'Enviar Template'}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8">

        {/* Formulário de Envio + Preview */}
        {showSendForm && template && (
          <div className="mb-8 flex flex-col lg:flex-row gap-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTemplate(new FormData(e.currentTarget));
              }}
              className="flex-1 min-w-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg"
            >
            <input
              ref={carouselFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onCarouselFileChange}
            />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Enviar Template</h3>
                <p className="text-sm text-gray-600">Configure os parâmetros e destinatários</p>
              </div>
            </div>
            
            {/* Números de telefone */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Números de Telefone <span className="text-red-500">*</span>
                </label>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl cursor-pointer hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Importar Planilha
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="phones"
                  required
                  value={phones}
                  onChange={(e) => setPhones(e.target.value)}
                  placeholder="Ex: 5599991187797, 5599982853513"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm"
                />
                {phones && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                    {phones.split(',').filter(Boolean).length} número(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Separe múltiplos números por vírgula ou importe uma planilha Excel/CSV
              </p>
            </div>

            {/* Parâmetros do Body */}
            {template.components?.map((comp, compIdx) => {
              if (comp.type === 'BODY' && comp.example?.body_text && comp.example.body_text.length > 0) {
                return (
                  <div key={`body-${compIdx}`} className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Parâmetros do Corpo:</h4>
                    {comp.example.body_text[0].map((example, i) => (
                      <div key={i} className="mb-2">
                        <label className="block text-sm mb-1">
                          Parâmetro {i + 1} <span className="text-red-500">*</span>
                          <span className="text-gray-500 ml-2">(Ex: {example})</span>
                        </label>
                        <input
                          type="text"
                          name={`body_${i}`}
                          required
                          placeholder={example}
                          value={previewBodyParams[i] ?? ''}
                          onChange={(e) => setPreviewBodyParams((prev) => {
                            const next = [...(prev.length ? prev : Array(comp.example!.body_text![0].length).fill(''))];
                            next[i] = e.target.value;
                            return next;
                          })}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })}

            {/* Parâmetros de Botões URL */}
            {template.components?.map((comp) => {
              if (comp.type === 'BUTTONS' && comp.buttons) {
                return comp.buttons.map((btn, btnIdx) => {
                  if (btn.type === 'URL' && btn.url?.includes('{{')) {
                    return (
                      <div key={`btn-${btnIdx}`} className="mb-4">
                        <label className="block text-sm font-medium mb-1">
                          Parâmetro do Botão &quot;{btn.text}&quot; <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name={`button_${btnIdx}`}
                          required
                          placeholder="Complemento da URL"
                          value={previewButtonParams[btnIdx] ?? ''}
                          onChange={(e) => setPreviewButtonParams((prev) => ({ ...prev, [btnIdx]: e.target.value }))}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">URL base: {btn.url}</p>
                      </div>
                    );
                  }
                  return null;
                });
              }
              return null;
            })}

            {/* Parâmetros do Carrossel: cards dinâmicos conforme JSON da API */}
            {template.components?.map((comp) => {
              const isCarousel = (comp.type || '').toUpperCase() === 'CAROUSEL' || comp.type === 'carousel';
              if (!isCarousel || !comp.cards?.length) return null;
              return (
                <div key="carousel-params" className="mb-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    Parâmetros do Carrossel ({comp.cards.length} card(s))
                  </h4>
                  {comp.cards.map((card, cardIdx) => (
                    <div key={cardIdx} className="mb-4 last:mb-0 p-3 bg-white rounded-lg border border-purple-100">
                      <div className="text-xs font-bold text-purple-700 mb-2">Card {cardIdx + 1}</div>
                      {card.components?.map((c) => {
                        const cType = (c.type || '').toLowerCase();
                        if (cType === 'header' && (c.format || '').toLowerCase() === 'image') {
                          const mediaId = carouselHeaderImageIds[cardIdx];
                          const isUploading = carouselUploadingCard === cardIdx;
                          return (
                            <div key={`card-${cardIdx}-header`} className="mb-2">
                              <input
                                type="hidden"
                                name={`carousel_card_${cardIdx}_header_image`}
                                value={mediaId ?? ''}
                              />
                              <label className="block text-sm mb-1">Imagem do header</label>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => openCarouselFilePicker(cardIdx)}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 disabled:opacity-50 text-sm font-medium"
                                >
                                  {isUploading ? (
                                    <>
                                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                      Enviando...
                                    </>
                                  ) : mediaId ? (
                                    <>Trocar imagem</>
                                  ) : (
                                    <>Enviar imagem</>
                                  )}
                                </button>
                                {mediaId && (
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    ID: {mediaId}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        if (cType === 'buttons' && c.buttons) {
                          return (
                            <div key={`card-${cardIdx}-buttons`} className="space-y-2">
                              {c.buttons.map((btn, btnIdx) => {
                                const btnType = (btn.type || '').toUpperCase();
                                if (btnType === 'QUICK_REPLY') {
                                  const key = `${cardIdx}-${btnIdx}`;
                                  return (
                                    <div key={btnIdx}>
                                      <label className="block text-sm mb-1">Botão &quot;{btn.text}&quot; (payload)</label>
                                      <input
                                        type="text"
                                        name={`carousel_card_${cardIdx}_button_${btnIdx}_payload`}
                                        placeholder="Ex: more-aloes"
                                        value={previewCarouselPayload[key] ?? ''}
                                        onChange={(e) => setPreviewCarouselPayload((prev) => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      />
                                    </div>
                                  );
                                }
                                if (btnType === 'URL') {
                                  const key = `${cardIdx}-${btnIdx}`;
                                  return (
                                    <div key={btnIdx}>
                                      <label className="block text-sm mb-1">Botão &quot;{btn.text}&quot; (texto do parâmetro da URL)</label>
                                      <input
                                        type="text"
                                        name={`carousel_card_${cardIdx}_button_${btnIdx}_text`}
                                        placeholder={btn.example?.[0] ?? 'Ex: blue-elf'}
                                        value={previewCarouselText[key] ?? ''}
                                        onChange={(e) => setPreviewCarouselText((prev) => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      />
                                      {btn.url && <p className="text-xs text-gray-500 mt-1">URL: {btn.url}</p>}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-blue-200">
              <button
                type="submit"
                disabled={sending}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Enviar Agora
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowSendForm(false)}
                className="flex-1 sm:flex-initial px-6 py-3.5 border-2 border-gray-300 rounded-xl hover:bg-gray-100 font-medium transition-all duration-200"
              >
                Cancelar
              </button>
            </div>
          </form>

            {/* Preview em tempo real */}
            <div className="w-full lg:w-[380px] flex-shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-green-600 px-4 py-2 text-white text-sm font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  Preview da mensagem
                </div>
                <div className="p-4 space-y-3 min-h-[200px]">
                  {/* Body */}
                  {template.components?.map((comp) => {
                    if ((comp.type || '').toUpperCase() !== 'BODY' || !comp.text) return null;
                    let text = comp.text;
                    (previewBodyParams || []).forEach((val, i) => {
                      text = text.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), val || `{{${i + 1}}}`);
                    });
                    return (
                      <p key="body" className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                    );
                  })}
                  {/* Carrossel */}
                  {template.components?.map((comp) => {
                    const isCarousel = (comp.type || '').toUpperCase() === 'CAROUSEL' || comp.type === 'carousel';
                    if (!isCarousel || !comp.cards?.length) return null;
                    return (
                      <div key="carousel-preview" className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Carrossel</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {comp.cards.map((card, cardIdx) => (
                            <div key={cardIdx} className="flex-shrink-0 w-28 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                              <div className="h-20 bg-gray-200 flex items-center justify-center overflow-hidden">
                                {carouselHeaderPreviewUrls[cardIdx] ? (
                                  <img
                                    src={carouselHeaderPreviewUrls[cardIdx]}
                                    alt={`Card ${cardIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : carouselHeaderImageIds[cardIdx] ? (
                                  <img
                                    src={`/api/whatsapp/media/${carouselHeaderImageIds[cardIdx]}`}
                                    alt={`Card ${cardIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-500">Imagem</span>
                                )}
                              </div>
                              <div className="p-2 space-y-1">
                                {card.components?.find((c) => (c.type || '').toLowerCase() === 'buttons')?.buttons?.map((btn, btnIdx) => (
                                  <div key={btnIdx} className="text-xs truncate text-gray-700">
                                    {btn.type === 'URL' ? (previewCarouselText[`${cardIdx}-${btnIdx}`] || btn.text) : (previewCarouselPayload[`${cardIdx}-${btnIdx}`] || btn.text)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Botões (template nível) */}
                  {template.components?.map((comp) => {
                    if ((comp.type || '').toUpperCase() !== 'BUTTONS' || !comp.buttons) return null;
                    return comp.buttons.map((btn, btnIdx) => (
                      <div key={btnIdx} className="text-xs">
                        <span className="font-medium text-gray-700">{btn.text}</span>
                        {btn.url && <span className="text-gray-500 ml-1">{previewButtonParams[btnIdx] ? `(${previewButtonParams[btnIdx]})` : ''}</span>}
                      </div>
                    ));
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {template.components && template.components.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Componentes do Template</h2>
            </div>
            {template.components.map((comp, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-bold shadow-sm">
                    {comp.type === 'HEADER' && '📋'}
                    {comp.type === 'BODY' && '📄'}
                    {comp.type === 'FOOTER' && '📌'}
                    {comp.type === 'BUTTONS' && '🔘'}
                    {((comp.type || '').toUpperCase() === 'CAROUSEL' || comp.type === 'carousel') && '🎠'}
                    {comp.type}
                  </span>
                  {comp.format && (
                    <span className="px-2 py-1 bg-white rounded-md text-xs font-medium text-gray-600 border border-gray-300">
                      {comp.format}
                    </span>
                  )}
                </div>
                {comp.text && (
                  <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm">
                    <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{comp.text}</p>
                  </div>
                )}
                {comp.buttons && comp.buttons.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Botões
                    </div>
                    <div className="space-y-2">
                      {comp.buttons.map((btn, btnIdx) => (
                        <div key={btnIdx} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                          <span className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{btn.text}</div>
                            {btn.url && (
                              <div className="text-xs text-blue-600 truncate mt-0.5">{btn.url}</div>
                            )}
                          </div>
                          <span className="flex-shrink-0 text-xs font-medium px-2 py-1 bg-gray-100 rounded">
                            {btn.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {comp.cards && comp.cards.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Cards do carrossel</div>
                    <div className="space-y-3">
                      {comp.cards.map((card, cardIdx) => (
                        <div key={cardIdx} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-bold text-gray-500 mb-2">Card {cardIdx + 1}</div>
                          {card.components?.map((c, i) => (
                            <div key={i} className="text-sm text-gray-700 mb-1">
                              {c.type === 'header' && c.format && <span className="font-medium">Header ({c.format})</span>}
                              {c.type === 'buttons' && c.buttons && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {c.buttons.map((b, bi) => (
                                    <span key={bi} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                      {b.text} ({b.type})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {comp.example && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Exemplo de Preenchimento
                    </div>
                    {comp.example.body_text && (
                      <div className="space-y-1">
                        {comp.example.body_text.map((arr, i) => (
                          <div key={i} className="text-sm text-amber-900 flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-200 rounded flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            {arr.join(' • ')}
                          </div>
                        ))}
                      </div>
                    )}
                    {comp.example.header_handle && (
                      <div className="text-sm text-amber-900 mt-2 truncate">
                        <span className="font-medium">Header:</span> {comp.example.header_handle[0]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
