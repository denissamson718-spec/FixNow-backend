const { readDb, writeDb } = require("../data/database");
const { createCreatedAt, createId } = require("../utils/account");

function listServiceRequests(req, res) {
  const db = readDb();
  const role = req.query.role;
  const status = req.query.status;

  let requests = db.serviceRequests;

  if (role) {
    requests = requests.filter((item) => item.requestedByRole === role);
  }

  if (status) {
    requests = requests.filter((item) => item.status === status);
  }

  res.json({ serviceRequests: requests });
}

function createServiceRequest(req, res) {
  const db = readDb();
  const payload = req.body || {};
  const nextRequest = {
    id: createId("req"),
    requestedByAccountId: payload.requestedByAccountId,
    vehicle: String(payload.vehicle || "").trim(),
    issue: String(payload.issue || "").trim(),
    locationLabel: String(payload.locationLabel || "").trim(),
    latitude: Number(payload.latitude || 0),
    longitude: Number(payload.longitude || 0),
    budget: String(payload.budget || "").trim(),
    paymentMethod: String(payload.paymentMethod || "").trim(),
    notes: String(payload.notes || "").trim(),
    videoRoomId: String(payload.videoRoomId || "").trim() || undefined,
    status: String(payload.status || "draft"),
    assignedMechanicId: payload.assignedMechanicId,
    selectedOfferId: payload.selectedOfferId,
    agreedPrice: payload.agreedPrice,
    repairCost: payload.repairCost,
    platformFee: payload.platformFee,
    totalPaymentDue: payload.totalPaymentDue,
    requestedByRole: payload.requestedByRole || "driver",
    createdAt: createCreatedAt()
  };

  db.serviceRequests.unshift(nextRequest);
  writeDb(db);
  res.status(201).json({ success: true, serviceRequest: nextRequest });
}

function updateServiceRequest(req, res) {
  const db = readDb();
  let updatedRequest;

  db.serviceRequests = db.serviceRequests.map((serviceRequest) => {
    if (serviceRequest.id !== req.params.requestId) {
      return serviceRequest;
    }

    updatedRequest = {
      ...serviceRequest,
      ...req.body
    };

    return updatedRequest;
  });

  if (!updatedRequest) {
    res.status(404).json({ success: false, message: "Service request not found." });
    return;
  }

  writeDb(db);
  res.json({ success: true, serviceRequest: updatedRequest });
}

module.exports = {
  listServiceRequests,
  createServiceRequest,
  updateServiceRequest
};
