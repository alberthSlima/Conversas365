"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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

type MedeirosProduct = {
  codProd: number;
  branchCode: string;
  description: string;
  ecommerceName: string;
  packaging: string;
  price: number;
  section: string;
  department: string;
  unit: string;
  stock: number;
  url: string;
  externalUpdatedAt: string;
  externalCreatedAt: string;
};

/** Campos do produto que o usuário pode vincular manualmente a um campo do template */
const PRODUCT_FIELDS_FOR_LINK: { key: keyof MedeirosProduct; label: string }[] = [
  { key: 'ecommerceName', label: 'Nome (e-commerce)' },
  { key: 'description', label: 'Descrição' },
  { key: 'price', label: 'Preço' },
  { key: 'url', label: 'Link' },
  { key: 'codProd', label: 'Código' },
  { key: 'section', label: 'Seção' },
  { key: 'department', label: 'Departamento' },
  { key: 'packaging', label: 'Embalagem' },
];

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
  const [carouselHeaderImageIds, setCarouselHeaderImageIds] = useState<Record<number, string>>({});
  const [carouselHeaderPreviewUrls, setCarouselHeaderPreviewUrls] = useState<Record<number, string>>({});
  const [carouselUploadingCard, setCarouselUploadingCard] = useState<number | null>(null);
  const [pendingCarouselUploadCard, setPendingCarouselUploadCard] = useState<number | null>(null);
  const carouselFileInputRef = useRef<HTMLInputElement>(null);
  const [previewBodyParams, setPreviewBodyParams] = useState<string[]>([]);
  const [previewButtonParams, setPreviewButtonParams] = useState<Record<number, string>>({});
  const [previewCarouselPayload, setPreviewCarouselPayload] = useState<Record<string, string>>({});
  const [previewCarouselText, setPreviewCarouselText] = useState<Record<string, string>>({});
  
  /** Estado para modal de confirmação antes de enviar */
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSelectorCardIdx, setProductSelectorCardIdx] = useState<number | null>(null);
  const [selectedProductForLinking, setSelectedProductForLinking] = useState<MedeirosProduct | null>(null);
  const [linkMapping, setLinkMapping] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<MedeirosProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('1');

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

  // Buscar produtos da API
  async function fetchProducts() {
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/medeiros/products?branch=${selectedBranch}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao buscar produtos');
      }
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      alert('Erro ao buscar produtos: ' + (e instanceof Error ? e.message : 'Erro desconhecido'));
    } finally {
      setLoadingProducts(false);
    }
  }

  // Abrir seletor de produtos (cardIdx = índice do card a preencher)
  function openProductSelector(cardIdx: number) {
    setProductSelectorCardIdx(cardIdx);
    setSelectedProductForLinking(null);
    setLinkMapping({});
    setShowProductSelector(true);
    if (products.length === 0) {
      fetchProducts();
    }
  }

  // Opções de destino para vincular (apenas botões do card do carrossel; corpo não é preenchido por este fluxo)
  function getTargetOptions(cardIdx: number): { value: string; label: string }[] {
    const opts: { value: string; label: string }[] = [{ value: '', label: '— Não preencher' }];
    const carouselComp = template?.components?.find(
      (c) => (c.type || '').toUpperCase() === 'CAROUSEL' || c.type === 'carousel'
    );
    const card = carouselComp?.cards?.[cardIdx];
    const buttonsComp = card?.components?.find((c) => (c.type || '').toLowerCase() === 'buttons');
    buttonsComp?.buttons?.forEach((btn, btnIdx) => {
      if ((btn.type || '').toUpperCase() === 'QUICK_REPLY') {
        opts.push({ value: `carousel_${cardIdx}_payload_${btnIdx}`, label: `Botão "${btn.text}" (payload)` });
      }
      if ((btn.type || '').toUpperCase() === 'URL') {
        opts.push({ value: `carousel_${cardIdx}_url_${btnIdx}`, label: `Botão "${btn.text}" (URL)` });
      }
    });
    return opts;
  }

  // Valor formatado do campo do produto para preencher no template
  function getProductFieldValue(product: MedeirosProduct, key: keyof MedeirosProduct): string {
    const v = product[key];
    if (key === 'price') return typeof v === 'number' ? `R$ ${(v as number).toFixed(2)}` : '';
    if (v === undefined || v === null) return '';
    return String(v);
  }

  // Aplicar o vínculo manual: preenche os campos do formulário conforme linkMapping
  function applyLinkMapping() {
    const product = selectedProductForLinking;
    const cardIdx = productSelectorCardIdx;
    if (!product || cardIdx === null || cardIdx === undefined) return;

    Object.entries(linkMapping).forEach(([productKey, targetId]) => {
      if (!targetId) return;
      const value = getProductFieldValue(product, productKey as keyof MedeirosProduct);
      if (targetId.startsWith('body_')) {
        const i = parseInt(targetId.replace('body_', ''), 10);
        if (!Number.isNaN(i)) {
          setPreviewBodyParams((prev) => {
            const next = prev.length ? [...prev] : [];
            next[i] = value;
            return next;
          });
        }
      }
      if (targetId.startsWith('carousel_')) {
        const m = targetId.match(/carousel_(\d+)_(payload|url)_(\d+)/);
        if (m) {
          const [, cIdx, type, bIdx] = m;
          const key = `${cIdx}-${bIdx}`;
          if (type === 'payload') {
            setPreviewCarouselPayload((prev) => ({ ...prev, [key]: value }));
          } else {
            // Para URL: extrair apenas o path (sem protocolo e domínio)
            let urlPath = value;
            try {
              const url = new URL(value);
              urlPath = url.pathname + url.search + url.hash; // Ex: /produto-slug-123
            } catch {
              // Se não for URL completa, assume que é apenas o path
              urlPath = value.startsWith('/') ? value : `/${value}`;
            }
            console.log(`[FRONTEND] Produto URL: "${value}" -> Path: "${urlPath}"`);
            setPreviewCarouselText((prev) => ({ ...prev, [key]: urlPath }));
          }
        }
      }
    });

    setSelectedProductForLinking(null);
    setLinkMapping({});
    setProductSelectorCardIdx(null);
    setShowProductSelector(false);
  }

  // Filtrar produtos por termo de busca
  const filteredProducts = products.filter(p => 
    (p.description?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
     p.ecommerceName?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
     p.section?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
     p.codProd?.toString().includes(productSearchTerm))
  );

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

  // Abrir modal de confirmação com preview
  function handlePreSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPendingFormData(formData);
    setShowConfirmModal(true);
  }

  // Confirmar e enviar de fato
  async function confirmAndSend() {
    if (!pendingFormData || !template) return;
    setShowConfirmModal(false);
    await handleSendTemplate(pendingFormData);
    setPendingFormData(null);
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
            const waId = messageId; // O waId é o ID da mensagem do WhatsApp
            const phone = responseData.contacts?.[0]?.input || phoneArray[0]; // Telefone do contato

            // Extrair o texto do body para salvar na conversa
            let bodyText = '';
            const bodyComp = template.components?.find((c) => (c.type || '').toUpperCase() === 'BODY');
            if (bodyComp?.text) {
              bodyText = bodyComp.text;
              // Substituir placeholders pelos valores reais
              const bodyParams = components.find((c) => c.type === 'body')?.parameters || [];
              bodyParams.forEach((param, idx) => {
                if (param.type === 'text' && param.text) {
                  bodyText = bodyText.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), param.text);
                }
              });
            }

            // Criar a conversa no backend com o payload completo
            try {
              await fetch('/api/conversations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone,
                  waId,
                  templateName: template.name,
                  bodyText,
                  templatePayload: payload, // Payload completo do template enviado
                  templateStructure: template, // Estrutura original do template
                }),
              });
            } catch (convError) {
              console.error('[CONVERSATION ERROR]', convError);
              // Não falhar o envio se a conversa não for criada
            }

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

      {/* Modal de Seleção de Produtos */}
      {showProductSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {selectedProductForLinking ? (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
                  <h3 className="text-xl font-bold text-white mb-2">🔗 Vincular campos do produto</h3>
                  <p className="text-purple-100 text-sm">
                    {selectedProductForLinking.ecommerceName || selectedProductForLinking.description} — R$ {selectedProductForLinking.price?.toFixed(2)}
                  </p>
                </div>
                <div className="p-6 overflow-auto flex-1">
                  <div className="space-y-4 max-w-2xl">
                    {PRODUCT_FIELDS_FOR_LINK.map(({ key, label }) => {
                      const targetOptions = getTargetOptions(productSelectorCardIdx ?? 0);
                      return (
                        <div key={key} className="flex flex-wrap items-center gap-3">
                          <label className="font-medium text-gray-700 min-w-[140px]">{label}</label>
                          <span className="text-gray-400">→</span>
                          <select
                            value={linkMapping[key] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLinkMapping((prev) => {
                                const next = { ...prev };
                                if (v) next[key] = v; else delete next[key];
                                return next;
                              });
                            }}
                            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {targetOptions.map((opt) => (
                              <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-sm text-gray-500 truncate max-w-[200px]" title={String(getProductFieldValue(selectedProductForLinking, key) ?? '')}>
                            Valor: {String(getProductFieldValue(selectedProductForLinking, key) ?? '—').slice(0, 30)}{(String(getProductFieldValue(selectedProductForLinking, key) ?? '').length > 30 ? '…' : '')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedProductForLinking(null); setLinkMapping({}); }}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => applyLinkMapping()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                  >
                    Aplicar
                  </button>
                </div>
              </>
            ) : (
              <>
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5">
              <h3 className="text-xl font-bold text-white mb-2">🛒 Selecione um produto</h3>
              <p className="text-green-100 text-sm">
                Escolha um produto e na próxima tela vincule os campos ao formulário
              </p>
            </div>
            
            <div className="p-6 border-b">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, código ou seção..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setProducts([]);
                  }}
                  className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="1">Maranhão</option>
                  <option value="7">Piauí</option>
                  <option value="19">Bahia</option>
                </select>
                <button
                  onClick={fetchProducts}
                  disabled={loadingProducts}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-all"
                >
                  {loadingProducts ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto flex-1">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium">
                    {products.length === 0 ? 'Clique em "Buscar" para carregar os produtos' : 'Nenhum produto encontrado'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.codProd}
                      onClick={() => setSelectedProductForLinking(product)}
                      className="group p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 text-left transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 group-hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-gray-600 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                              {product.ecommerceName || product.description}
                            </div>
                            <div className="flex-shrink-0 font-bold text-green-600 text-lg">
                              R$ {product.price?.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                              Cód: {product.codProd}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 rounded text-blue-700">
                              {product.section}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 rounded text-purple-700">
                              {product.department}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {product.packaging}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => {
                  setShowProductSelector(false);
                  setProductSearchTerm('');
                  setProductSelectorCardIdx(null);
                  setSelectedProductForLinking(null);
                  setLinkMapping({});
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
              </>
            )}
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

        {/* Formulário de Envio com Preview embaixo (não mais fixo) */}
        {showSendForm && template && (
          <div className="mb-8 space-y-6">
            <form
              onSubmit={handlePreSubmit}
              className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg"
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
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-purple-700">Card {cardIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => openProductSelector(cardIdx)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 text-xs font-semibold shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Preencher com Produto
                        </button>
                      </div>
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
          </div>
        )}

        {/* Modal de Confirmação com Preview */}
        {showConfirmModal && template && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Preview da Mensagem</h3>
                    <p className="text-sm text-white/90">Confira antes de enviar</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-auto flex-1 bg-gradient-to-br from-gray-50 to-white">
                {/* Body */}
                {template.components?.map((comp) => {
                  if ((comp.type || '').toUpperCase() !== 'BODY' || !comp.text) return null;
                  let text = comp.text;
                  (previewBodyParams || []).forEach((val, i) => {
                    text = text.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), val || `{{${i + 1}}}`);
                  });
                  return (
                    <div key="body" className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                    </div>
                  );
                })}

                {/* Carrossel - Horizontal com scroll */}
                {template.components?.map((comp) => {
                  const isCarousel = (comp.type || '').toUpperCase() === 'CAROUSEL' || comp.type === 'carousel';
                  if (!isCarousel || !comp.cards?.length) return null;
                  return (
                    <div key="carousel-preview" className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Carrossel ({comp.cards?.length || 0} cards)
                      </p>
                      <div className="flex gap-4 overflow-x-auto pb-3 -mx-2 px-2" style={{scrollbarWidth: 'thin'}}>
                        {comp.cards.map((card, cardIdx) => (
                          <div key={cardIdx} className="flex-shrink-0 w-72 rounded-xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm">
                            <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                              {carouselHeaderPreviewUrls[cardIdx] ? (
                                <Image src={carouselHeaderPreviewUrls[cardIdx]} alt={`Card ${cardIdx + 1}`} fill className="object-cover" unoptimized />
                              ) : carouselHeaderImageIds[cardIdx] ? (
                                <Image src={`/api/whatsapp/media/${carouselHeaderImageIds[cardIdx]}`} alt={`Card ${cardIdx + 1}`} fill className="object-cover" unoptimized />
                              ) : (
                                <div className="text-center">
                                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-sm text-gray-500">Card {cardIdx + 1}</span>
                                </div>
                              )}
                              <div className="absolute top-3 left-3 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                                {cardIdx + 1}/{comp.cards?.length || 0}
                              </div>
                            </div>
                            {card.components?.find((c) => (c.type || '').toLowerCase() === 'buttons')?.buttons && (
                              <div className="p-3 space-y-2 bg-gray-50">
                                {card.components?.find((c) => (c.type || '').toLowerCase() === 'buttons')?.buttons?.map((btn, btnIdx) => (
                                  <div key={btnIdx} className="flex items-center gap-2 text-xs">
                                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                      </svg>
                                    </div>
                                    <span className="font-medium text-gray-700 truncate">
                                      {btn.type === 'URL' ? btn.text : (previewCarouselPayload[`${cardIdx}-${btnIdx}`] || btn.text)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Botões (template nível) */}
                {template.components?.map((comp) => {
                  if ((comp.type || '').toUpperCase() !== 'BUTTONS' || !comp.buttons) return null;
                  return (
                    <div key="buttons" className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm space-y-2">
                      {comp.buttons.map((btn, btnIdx) => (
                        <div key={btnIdx} className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="font-medium text-gray-700">{btn.text}</span>
                          {btn.url && <span className="text-gray-500 text-xs">{previewButtonParams[btnIdx] ? `(${previewButtonParams[btnIdx]})` : ''}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-gray-50 border-t-2 border-gray-200 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAndSend}
                  disabled={sending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      Confirmar e Enviar
                    </>
                  )}
                </button>
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
