const path = require("path");

const backendRoot = path.resolve(__dirname, "..", "..");
const projectRoot = path.resolve(backendRoot, "..");

const dataDir = path.resolve(process.env.DATA_DIR || path.join(backendRoot, "data"));

module.exports = {
  backendRoot,
  projectRoot,
  dataDir,
  dataFilePath: path.join(dataDir, "db.json"),
  uploadsDir: path.join(dataDir, "uploads"),
  adminWebDir: path.join(projectRoot, "admin-web")
};
