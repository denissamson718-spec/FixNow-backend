function parseCurrency(value) {
  const digits = String(value || "").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(digits);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function buildPaymentSummary(repairCostInput) {
  const repairCost = parseCurrency(repairCostInput);
  const platformFeeValue = repairCost * 0.07;
  const totalPaymentDueValue = repairCost + platformFeeValue;

  return {
    repairCost: formatCurrency(repairCost),
    platformFee: formatCurrency(platformFeeValue),
    totalPaymentDue: formatCurrency(totalPaymentDueValue)
  };
}

module.exports = {
  buildPaymentSummary
};
