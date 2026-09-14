const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const app = require("./app");
const db = require("./data/database");
const { databaseErrorMessage } = require("./utils/databaseError");
const PORT = process.env.PORT || 4010;
async function start() {
  await db.initializeDatabase();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`FixNow backend running on http://0.0.0.0:${PORT} (storage: ${db.storageMode()})`);
  });
  server.on("error", async (error) => {
    console.error(error.code === "EADDRINUSE" ? `Port ${PORT} is already in use. Stop the old backend first.` : "Backend could not open its listening port.");
    await db.closeDatabase();
    process.exitCode = 1;
  });
  for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => server.close(() => db.closeDatabase()));
}
start().catch(async (error) => {
  console.error(databaseErrorMessage(error));
  await db.closeDatabase();
  process.exitCode = 1;
});
