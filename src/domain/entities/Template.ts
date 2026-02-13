import { TemplateId } from '../value-objects/TemplateId';

/**
 * Entity: Template
 * Representa um template de mensagem do WhatsApp
 */

export type CarouselCardComponent = {
  type: string;
  format?: string;
  example?: { header_handle?: string[] };
  buttons?: Array<{ type: string; text: string; url?: string; example?: string[] }>;
};

export type TemplateComponent = {
  type: string;
  text?: string;
  format?: string;
  buttons?: Array<{ type: string; text: string; url?: string; example?: string[] }>;
  example?: {
    body_text?: string[][];
    header_handle?: string[];
  };
  /** Carrossel: quando type é CAROUSEL/carousel, contém os cards */
  cards?: Array<{ components: CarouselCardComponent[] }>;
};

export type TemplateStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

export class Template {
  constructor(
    private readonly id: TemplateId,
    private readonly name: string,
    private readonly language: string,
    private readonly status: TemplateStatus,
    private readonly category: string,
    private readonly components: TemplateComponent[]
  ) {}

  static fromPrimitives(data: {
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components?: TemplateComponent[];
  }): Template {
    return new Template(
      TemplateId.create(data.id),
      data.name,
      data.language,
      data.status as TemplateStatus,
      data.category,
      data.components || []
    );
  }

  getId(): TemplateId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getLanguage(): string {
    return this.language;
  }

  getStatus(): TemplateStatus {
    return this.status;
  }

  getCategory(): string {
    return this.category;
  }

  getComponents(): TemplateComponent[] {
    return [...this.components];
  }

  isApproved(): boolean {
    return this.status === 'APPROVED';
  }

  hasComponents(): boolean {
    return this.components.length > 0;
  }

  getBodyComponent(): TemplateComponent | undefined {
    return this.components.find(c => c.type === 'BODY');
  }

  getButtonsComponent(): TemplateComponent | undefined {
    return this.components.find(c => c.type === 'BUTTONS');
  }

  /**
   * Retorna os parâmetros necessários do body
   */
  getBodyParameters(): string[][] {
    const body = this.getBodyComponent();
    return body?.example?.body_text || [];
  }

  /**
   * Retorna os botões do template
   */
  getButtons(): Array<{ type: string; text: string; url?: string }> {
    const buttons = this.getButtonsComponent();
    return buttons?.buttons || [];
  }

  /**
   * Converte para formato primitivo (para APIs, UI, etc)
   */
  toPrimitives(): {
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
  } {
    return {
      id: this.id.getValue(),
      name: this.name,
      language: this.language,
      status: this.status,
      category: this.category,
      components: this.components,
    };
  }
}
