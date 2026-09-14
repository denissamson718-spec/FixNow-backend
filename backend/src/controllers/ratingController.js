const { asyncHandler } = require("../utils/asyncHandler");
const { readDb, writeDb } = require("../data/database");
const { createCreatedAt, createId } = require("../utils/account");

async function listRatings(req, res) {
  const db = await readDb();
  const mechanicId = req.query.mechanicId;

  const ratings = mechanicId ? db.ratings.filter((rating) => rating.mechanicId === mechanicId) : db.ratings;
  res.json({ ratings });
}

async function createRating(req, res) {
  const db = await readDb();
  const payload = req.body || {};
  const nextRating = {
    id: createId("rating"),
    mechanicId: payload.mechanicId,
    mechanicName: String(payload.mechanicName || "").trim(),
    score: Number(payload.score || 0),
    comment: String(payload.comment || "").trim(),
    date: payload.date || createCreatedAt()
  };

  db.ratings.unshift(nextRating);
  await writeDb(db);
  res.status(201).json({ success: true, rating: nextRating });
}

module.exports = {
  listRatings: asyncHandler(listRatings),
  createRating: asyncHandler(createRating)
};
