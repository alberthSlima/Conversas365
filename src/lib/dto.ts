export type BackendConversation = {
	id: number;
	state?: string;
	initiatedBy?: string;
	context?: string;
	createdAt: string;
	updatedAt?: string;
};

export type CarouselCard = {
	imageId: string;
	buttons: Array<{
		text: string;
		type: 'QUICK_REPLY' | 'URL';
		url?: string;
	}>;
};

export type ConversationUI = {
	id: number;
	state?: string;
	initiatedBy?: string;
	text: string;
	buttons: string[];
	images: string[];
	carouselCards: CarouselCard[];
	createdAt: string;
	updatedAt?: string;
};

export function parseContextText(context?: string): string {
	if (!context || typeof context !== 'string') return '';
	const raw = context.trim();
	if (!raw.startsWith('{')) return raw;
	// WhatsApp envelope com entry/changes
	try {
		type WaMsg = { type?: string; text?: { body?: string }; button?: { text?: string } };
		type WaChange = { value?: { messages?: WaMsg[] } };
		const obj = JSON.parse(raw) as { entry?: Array<{ changes?: WaChange[] }> };
		const msg0: WaMsg | undefined = obj.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
		if (msg0) {
			if (msg0.text?.body && msg0.text.body.trim()) return msg0.text.body;
			if (msg0.type === 'button' && msg0.button?.text) return msg0.button.text;
			if (typeof msg0.type === 'string') return `[${msg0.type}]`;
		}
	} catch {}
	// Envelope simplificado { messages: [...] }
	try {
		type Msg = { type?: string; text?: { body?: string }; button?: { text?: string } };
		const obj3 = JSON.parse(raw) as { messages?: Msg[] };
		const msg = obj3.messages?.[0];
		if (msg) {
			if (msg.text?.body) return msg.text.body;
			if (msg.button?.text) return msg.button.text;
			if (msg.type) return `[${msg.type}]`;
		}
	} catch {}
	// HSM Components
	try {
		const obj = JSON.parse(raw) as { Components?: Array<{ Text?: string; Type?: string }> };
		if (Array.isArray(obj?.Components)) {
			const body = obj.Components.find(c => (c.Type || '').toLowerCase() === 'body');
			if (body?.Text) return body.Text;
		}
	} catch {}
	return raw;
}

export function parseContextButtons(context?: string): string[] {
	if (!context || typeof context !== 'string') return [];
	const raw = context.trim();
	if (!raw.startsWith('{')) return [];
	try {
		const obj = JSON.parse(raw) as { Components?: Array<{ Text?: string; Type?: string; SubType?: string }> };
		if (Array.isArray(obj?.Components)) {
			return obj.Components
				.filter(c => (c.SubType || '').toUpperCase() === 'QUICK_REPLY')
				.map(c => c.Text || '')
				.filter(Boolean);
		}
	} catch {}
	return [];
}

export function parseContextImages(context?: string): string[] {
	if (!context || typeof context !== 'string') return [];
	const raw = context.trim();
	if (!raw.startsWith('{')) return [];
	try {
		type Component = { 
			Text?: string; 
			Type?: string; 
			SubType?: string; 
			Parameters?: Array<{ Type?: string; Text?: string }> 
		};
		const obj = JSON.parse(raw) as { Components?: Component[] };
		if (Array.isArray(obj?.Components)) {
			const images: string[] = [];
			for (const comp of obj.Components) {
				if ((comp.Type || '').toLowerCase() === 'header' && 
				    (comp.SubType || '').toUpperCase() === 'IMAGE' &&
				    Array.isArray(comp.Parameters)) {
					const imageParam = comp.Parameters.find(p => (p.Type || '').toLowerCase() === 'image');
					if (imageParam?.Text) {
						images.push(imageParam.Text);
					}
				}
			}
			return images;
		}
	} catch {}
	return [];
}

export function parseCarouselCards(context?: string): CarouselCard[] {
	if (!context || typeof context !== 'string') return [];
	const raw = context.trim();
	if (!raw.startsWith('{')) return [];
	
	try {
		type Component = { 
			Text?: string; 
			Type?: string; 
			SubType?: string;
			Index?: number;
			Url?: string;
			Parameters?: Array<{ Type?: string; Text?: string }> 
		};
		const obj = JSON.parse(raw) as { Components?: Component[] };
		if (!Array.isArray(obj?.Components)) return [];
		
		const cards: CarouselCard[] = [];
		let currentCard: CarouselCard | null = null;
		
		for (const comp of obj.Components) {
			// Novo card quando encontra um header de imagem
			if ((comp.Type || '').toLowerCase() === 'header' && 
			    (comp.SubType || '').toUpperCase() === 'IMAGE' &&
			    Array.isArray(comp.Parameters)) {
				const imageParam = comp.Parameters.find(p => (p.Type || '').toLowerCase() === 'image');
				if (imageParam?.Text) {
					// Salva o card anterior se existir
					if (currentCard) {
						cards.push(currentCard);
					}
					// Cria novo card
					currentCard = {
						imageId: imageParam.Text,
						buttons: []
					};
				}
			}
			// Adiciona botões ao card atual (QUICK_REPLY e URL)
			else if (currentCard && (comp.Type || '').toLowerCase() === 'button') {
				const subType = (comp.SubType || '').toUpperCase();
				
				// QUICK_REPLY
				if (subType === 'QUICK_REPLY' && comp.Text) {
					currentCard.buttons.push({
						text: comp.Text, // Texto do template
						type: 'QUICK_REPLY'
					});
				}
				// URL: já vem completa (base + sufixo foi concatenado no backend)
				else if (subType === 'URL' && comp.Text) {
					currentCard.buttons.push({
						text: comp.Text, // Texto do template
						type: 'URL',
						url: comp.Url || '' // URL completa
					});
				}
			}
		}
		
		// Adiciona o último card
		if (currentCard) {
			cards.push(currentCard);
		}
		
		return cards;
	} catch (error) {
		console.error('[DTO] Erro ao parsear carousel cards:', error);
	}
	return [];
}

export function mapConversationToUI(b: BackendConversation): ConversationUI {
	return {
		id: b.id,
		state: b.state,
		initiatedBy: b.initiatedBy,
		text: parseContextText(b.context),
		buttons: parseContextButtons(b.context),
		images: parseContextImages(b.context),
		carouselCards: parseCarouselCards(b.context),
		createdAt: b.createdAt,
		updatedAt: b.updatedAt,
	};
}


