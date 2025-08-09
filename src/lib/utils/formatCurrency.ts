// utils/formatCurrency.ts
export const formatCurrency = (amount: number | string): string => {
  const num =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? Number(amount)
        : NaN;

  if (isNaN(num)) return 'Rs 0.00'; // fallback

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};
