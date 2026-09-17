const cors = require("cors");
const express = require("express");
const fs = require("fs");
const path = require("path");

const { projectRoot, uploadsDir } = require("./config/paths");
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
    message: "FixNow backend is running. Visit /api/health for API health."
  });
});

app.use("/api/uploads", express.static(uploadsDir));
app.use("/api", apiRoutes);
const adminWebDir = path.join(projectRoot, "web", "dist");
const adminIndex = path.join(adminWebDir, "index.html");
if (fs.existsSync(adminIndex)) {
  app.get("/admin", (req, res) => res.redirect(302, "/admin/"));
  app.use("/admin", express.static(adminWebDir));
  app.get(["/admin/login", "/admin/dashboard", "/admin/dashboard/*"], (req, res) => res.sendFile(adminIndex));
} else if (process.env.NODE_ENV !== "production") {
  app.get("/admin", (req, res) => res.redirect(302, "http://localhost:3000/admin/"));
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
