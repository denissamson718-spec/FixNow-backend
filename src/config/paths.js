const path = require("path");

const backendRoot = path.resolve(__dirname, "..", "..");
const projectRoot = path.resolve(backendRoot, "..");

module.exports = {
  backendRoot,
  projectRoot,
  dataDir: path.join(backendRoot, "data"),
  dataFilePath: path.join(backendRoot, "data", "db.json"),
  uploadsDir: path.join(backendRoot, "data", "uploads"),
  adminWebDir: path.join(projectRoot, "admin-web")
};
