export type BackendConversation = {
	id: number;
	state?: string;
	initiatedBy?: string;
	context?: string;
	createdAt: string;
	updatedAt?: string;
};

export type ConversationUI = {
	id: number;
	state?: string;
	initiatedBy?: string;
	text: string;
	buttons: string[];
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

export function mapConversationToUI(b: BackendConversation): ConversationUI {
	return {
		id: b.id,
		state: b.state,
		initiatedBy: b.initiatedBy,
		text: parseContextText(b.context),
		buttons: parseContextButtons(b.context),
		createdAt: b.createdAt,
		updatedAt: b.updatedAt,
	};
}


