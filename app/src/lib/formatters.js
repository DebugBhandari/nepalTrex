export function formatCurrency(value, currency = 'NPR') {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}