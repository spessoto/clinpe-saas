export const FINANCIAL_CATEGORIES = [
  "Procedimentos",
  "Aluguel",
  "Folha",
  "Insumos",
  "Impostos",
  "Marketing",
  "Tecnologia",
  "Serviços",
  "Utilidades",
  "Outros",
] as const;

export type FinancialCategory = (typeof FINANCIAL_CATEGORIES)[number];

export function isValidFinancialCategory(
  value: string,
): value is FinancialCategory {
  return FINANCIAL_CATEGORIES.includes(value as FinancialCategory);
}
