const { readDb, writeDb } = require("../data/database");
const { createCreatedAt, createId } = require("../utils/account");
const { buildPaymentSummary } = require("../utils/payment");

function listPayments(req, res) {
  const db = readDb();
  const requestId = req.query.requestId;

  const payments = requestId ? db.payments.filter((payment) => payment.requestId === requestId) : db.payments;
  res.json({ payments });
}

function createPayment(req, res) {
  const db = readDb();
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
  writeDb(db);
  res.status(201).json({ success: true, payment: nextPayment });
}

module.exports = {
  listPayments,
  createPayment
};
