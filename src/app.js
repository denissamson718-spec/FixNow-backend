const cors = require("cors");
const express = require("express");
const fs = require("fs");

const { uploadsDir } = require("./config/paths");
const { errorHandler } = require("./middleware/errorHandler");
const { notFoundHandler } = require("./middleware/notFound");
const apiRoutes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.get("/", (req, res) => {
  res.json({
    name: "FixNow Backend",
    message: "FixNow backend is running. Open http://localhost:3000 for the admin dashboard or /api/health for API health."
  });
});

app.use("/api/uploads", express.static(uploadsDir));
app.use("/api", apiRoutes);
app.get("/admin", (req, res) => {
  res.redirect(302, "http://localhost:3000");
});

app.get("/admin/*", (req, res) => {
  res.redirect(302, "http://localhost:3000");
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
