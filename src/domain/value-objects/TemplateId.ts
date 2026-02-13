/**
 * Value Object: TemplateId
 * Representa um identificador único de template
 */
export class TemplateId {
  private constructor(private readonly value: string) {}

  static create(value: string): TemplateId {
    if (!value || value.trim().length === 0) {
      throw new Error('Template ID não pode ser vazio');
    }

    return new TemplateId(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TemplateId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
