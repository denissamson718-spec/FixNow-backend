export function parseCurrency(value: string) {
  const digits = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(digits);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function addPercentageCharge(value: string, percentage: number) {
  const baseAmount = parseCurrency(value);

  if (baseAmount <= 0) {
    return {
      basePrice: value.trim() || "$0.00",
      surcharge: "$0.00",
      totalPrice: "$0.00"
    };
  }

  const surchargeAmount = baseAmount * percentage;
  const totalAmount = baseAmount + surchargeAmount;

  return {
    basePrice: formatCurrency(baseAmount),
    surcharge: formatCurrency(surchargeAmount),
    totalPrice: formatCurrency(totalAmount)
  };
}
