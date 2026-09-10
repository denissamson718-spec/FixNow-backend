const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const app = require("./app");

const PORT = process.env.PORT || 4010;

// Initialize storage before accepting traffic.
require("./data/database").readDb();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FixNow backend running on http://0.0.0.0:${PORT}`);
});
