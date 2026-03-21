export function normalizeBrazilTaxId(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidBrazilTaxId(value: string | null | undefined) {
  const normalized = normalizeBrazilTaxId(value);
  return normalized.length === 11 || normalized.length === 14;
}

export function formatBrazilTaxId(value: string | null | undefined) {
  const normalized = normalizeBrazilTaxId(value);

  if (normalized.length === 11) {
    return normalized.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (normalized.length === 14) {
    return normalized.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return normalized;
}
