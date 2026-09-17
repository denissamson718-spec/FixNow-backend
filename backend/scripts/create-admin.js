const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });

const db = require("../src/data/database");
const { createCreatedAt, createId, normalizeEmail } = require("../src/utils/account");
const { databaseErrorMessage } = require("../src/utils/databaseError");

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = String(process.env.ADMIN_PASSWORD || "");
  const fullName = String(process.env.ADMIN_NAME || "FixNow Admin").trim();
  if (!email || !email.includes("@") || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) before running admin:create.");
  }

  await db.initializeDatabase();
  const data = await db.readDb();
  if (data.accounts.some((account) => normalizeEmail(account.profile?.email) === email)) {
    throw new Error("An account with that email already exists. No changes were made.");
  }
  data.accounts.push({
    id: createId("admin"),
    profile: { fullName, email, phone: "" },
    role: "admin",
    password,
    approvalStatus: "approved",
    createdAt: createCreatedAt()
  });
  await db.writeDb(data);
  console.log(`Admin account created for ${email} in ${db.storageMode()} storage.`);
}

main().catch((error) => {
  console.error(databaseErrorMessage(error));
  process.exitCode = 1;
}).finally(() => db.closeDatabase());
