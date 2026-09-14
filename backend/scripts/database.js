const fs = require("fs");
const path = require("path");
require("dotenv").config({path: path.join(__dirname, "../.env"), quiet: true});
const db = require("../src/data/database");
const {databaseErrorMessage} = require("../src/utils/databaseError");
async function main() {
  if (db.storageMode() !== "postgres") throw new Error("DATABASE_URL is required for Supabase commands.");
  await db.initializeDatabase();
  if (process.argv[2] === "import") {
    const current = await db.readDb();
    if (Object.keys(db.tables).some(key => current[key].length)) {
      console.error("Import refused: Supabase already has FixNow records. Nothing was overwritten.");
      process.exitCode = 1;
      return;
    }
    const sourcePath = process.argv[3] ? path.resolve(process.argv[3]) : require("../src/config/paths").dataFilePath;
    const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    for (const key of Object.keys(db.tables)) current[key] = source[key] || [];
    db.validateDb(current);
    await db.writeDb(current);
    console.log("Imported records into Supabase. Source file was not modified.");
  }
  const current = await db.readDb();
  console.log("Supabase connection verified. Table row counts:");
  for (const [key, table] of Object.entries(db.tables)) console.log(`${table}: ${current[key].length}`);
}
main().catch(error => {console.error(databaseErrorMessage(error)); process.exitCode = 1;}).finally(() => db.closeDatabase());
