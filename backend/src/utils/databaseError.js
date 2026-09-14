function databaseErrorMessage(error) {
  if (error.message?.startsWith("DATABASE_URL") || error.message?.startsWith("Replace the password")) return error.message;
  if (error.code === "28P01") return "Supabase rejected the database password. Update DATABASE_URL in backend/.env.";
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ENETUNREACH", "ETIMEDOUT"].includes(error.code)) return "Cannot reach Supabase. Check the network and Session pooler connection string.";
  if (["SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT"].includes(error.code)) return "Supabase TLS verification failed. Download the database CA certificate and set DATABASE_SSL_CA_FILE.";
  return "Database operation failed. Check database availability, credentials, and schema permissions.";
}
module.exports = { databaseErrorMessage };
