/**
 * Value Object: PhoneNumber
 * Representa um número de telefone válido
 */
export class PhoneNumber {
  private constructor(private readonly value: string) {}

  static create(value: string): PhoneNumber {
    const cleaned = value.replace(/\D/g, '');
    
    if (!cleaned) {
      throw new Error('Número de telefone não pode ser vazio');
    }

    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new Error('Número de telefone inválido');
    }

    return new PhoneNumber(cleaned);
  }

  static createOrNull(value: string): PhoneNumber | null {
    try {
      return PhoneNumber.create(value);
    } catch {
      return null;
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  // Formata para exibição: 5599991187797 -> (99) 99911-87797
  toFormattedString(): string {
    if (this.value.length === 13 && this.value.startsWith('55')) {
      const ddd = this.value.substring(2, 4);
      const firstPart = this.value.substring(4, 9);
      const secondPart = this.value.substring(9);
      return `(${ddd}) ${firstPart}-${secondPart}`;
    }
    return this.value;
  }
}
