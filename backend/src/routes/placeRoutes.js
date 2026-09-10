const express = require("express");

const router = express.Router();
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

router.get("/nearby", async (req, res) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const requestedRadius = Number(req.query.radius);
  const radius = Number.isFinite(requestedRadius)
    ? Math.min(Math.max(requestedRadius, 1000), 12000)
    : 8000;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400).json({ message: "Valid latitude and longitude are required." });
    return;
  }

  const query = `[out:json][timeout:25];
(
  nwr["amenity"="fuel"](around:${radius},${latitude},${longitude});
  nwr["shop"="car_repair"](around:${radius},${latitude},${longitude});
  nwr["craft"="car_repair"](around:${radius},${latitude},${longitude});
);
out center tags;`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "FixNow-Roadside-App/1.0"
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    });

    if (!response.ok) {
      res.status(502).json({ message: "The nearby place service is temporarily unavailable." });
      return;
    }

    const payload = await response.json();
    res.json({ elements: Array.isArray(payload.elements) ? payload.elements : [] });
  } catch (error) {
    const timedOut = error && error.name === "AbortError";
    res.status(504).json({
      message: timedOut
        ? "The nearby place search timed out. Please try again."
        : "The nearby place service could not be reached."
    });
  } finally {
    clearTimeout(timer);
  }
});

module.exports = router;
