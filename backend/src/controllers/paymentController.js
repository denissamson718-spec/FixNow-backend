const { asyncHandler } = require("../utils/asyncHandler");
const { readDb, writeDb } = require("../data/database");
const { createCreatedAt, createId } = require("../utils/account");
const { buildPaymentSummary } = require("../utils/payment");

async function listPayments(req, res) {
  const db = await readDb();
  const requestId = req.query.requestId;

  const payments = requestId ? db.payments.filter((payment) => payment.requestId === requestId) : db.payments;
  res.json({ payments });
}

async function createPayment(req, res) {
  const db = await readDb();
  const payload = req.body || {};
  const summary = buildPaymentSummary(payload.repairCost);
  const nextPayment = {
    id: createId("payment"),
    requestId: payload.requestId,
    mechanicId: payload.mechanicId,
    repairCost: summary.repairCost,
    platformFee: summary.platformFee,
    totalPaymentDue: summary.totalPaymentDue,
    status: payload.status || "pending",
    createdAt: createCreatedAt()
  };

  db.payments.unshift(nextPayment);
  await writeDb(db);
  res.status(201).json({ success: true, payment: nextPayment });
}

module.exports = {
  listPayments: asyncHandler(listPayments),
  createPayment: asyncHandler(createPayment)
};
