const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = require("./app");

const PORT = process.env.PORT || 4010;

app.listen(PORT, () => {
  console.log(`FixNow backend running on http://localhost:${PORT}`);
});
