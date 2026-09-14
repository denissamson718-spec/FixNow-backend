const { asyncHandler } = require("../utils/asyncHandler");
const { readDb, writeDb } = require("../data/database");
const { createCreatedAt, createId } = require("../utils/account");

async function listOffers(req, res) {
  const db = await readDb();
  const requestId = req.query.requestId;
  const mechanicId = req.query.mechanicId;

  let offers = db.offers;

  if (requestId) {
    offers = offers.filter((offer) => offer.requestId === requestId);
  }

  if (mechanicId) {
    offers = offers.filter((offer) => offer.mechanicId === mechanicId);
  }

  res.json({ offers });
}

async function createOffer(req, res) {
  const db = await readDb();
  const payload = req.body || {};
  const nextOffer = {
    id: createId("offer"),
    requestId: payload.requestId,
    mechanicId: payload.mechanicId,
    transportType: payload.transportType,
    price: String(payload.price || "").trim(),
    basePrice: payload.basePrice,
    surcharge: payload.surcharge,
    etaMinutes: Number(payload.etaMinutes || 0),
    distanceKm: Number(payload.distanceKm || 0),
    message: String(payload.message || "").trim(),
    status: String(payload.status || "pending"),
    createdAt: createCreatedAt()
  };

  db.offers.unshift(nextOffer);
  await writeDb(db);
  res.status(201).json({ success: true, offer: nextOffer });
}

async function updateOffer(req, res) {
  const db = await readDb();
  let updatedOffer;

  db.offers = db.offers.map((offer) => {
    if (offer.id !== req.params.offerId) {
      return offer;
    }

    updatedOffer = {
      ...offer,
      ...req.body
    };

    return updatedOffer;
  });

  if (!updatedOffer) {
    res.status(404).json({ success: false, message: "Offer not found." });
    return;
  }

  await writeDb(db);
  res.json({ success: true, offer: updatedOffer });
}

module.exports = {
  listOffers: asyncHandler(listOffers),
  createOffer: asyncHandler(createOffer),
  updateOffer: asyncHandler(updateOffer)
};
