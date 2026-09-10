const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { uploadsDir } = require("../config/paths");
const { readDb, writeDb } = require("../data/database");
const { sendPasswordResetEmail } = require("../services/mailService");
const { createAccountId, createCreatedAt, normalizeEmail } = require("../utils/account");

const mimeExtensionMap = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf"
};

function normalizeFileLabel(value, fallback) {
  const raw = String(value || fallback || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return raw || fallback;
}

function parseDataUri(dataUri) {
  const match = String(dataUri || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return undefined;
  }

  return {
    mimeType: match[1].toLowerCase(),
    base64Data: match[2]
  };
}

function persistAssetForAdmin(asset, prefix) {
  if (!asset) {
    return asset;
  }

  const sourceDataUri =
    typeof asset.webUri === "string" && asset.webUri.startsWith("data:")
      ? asset.webUri
      : typeof asset.uri === "string" && asset.uri.startsWith("data:")
        ? asset.uri
        : "";

  const parsed = parseDataUri(sourceDataUri);

  if (!parsed) {
    return asset;
  }

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const normalizedLabel = normalizeFileLabel(asset.fileName, prefix);
  const currentExtension = path.extname(normalizedLabel).replace(".", "");
  const resolvedExtension = currentExtension || mimeExtensionMap[parsed.mimeType] || "bin";
  const fileStem = normalizeFileLabel(path.basename(normalizedLabel, path.extname(normalizedLabel)), prefix);
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${fileStem}-${uniqueSuffix}.${resolvedExtension}`;
  const absolutePath = path.join(uploadsDir, fileName);

  fs.writeFileSync(absolutePath, Buffer.from(parsed.base64Data, "base64"));

  return {
    ...asset,
    fileName: asset.fileName || fileName,
    mimeType: asset.mimeType || parsed.mimeType,
    uri: `/api/uploads/${fileName}`,
    webUri: `/api/uploads/${fileName}`
  };
}

function hasServerStoredAsset(asset) {
  const uri = String(asset?.webUri || asset?.uri || "");
  return uri.startsWith("/api/uploads/");
}

function isLocalFallbackAllowed() {
  const envValue = String(process.env.ALLOW_RESET_LINK_FALLBACK || "").trim().toLowerCase();

  if (envValue === "true" || envValue === "1" || envValue === "yes") {
    return true;
  }

  if (envValue === "false" || envValue === "0" || envValue === "no") {
    return false;
  }

  return String(process.env.NODE_ENV || "").trim().toLowerCase() !== "production";
}

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function isValidResetPassword(password) {
  return String(password || "").trim().length >= 8;
}

function buildResetLink(req, token) {
  const publicUrl = String(process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "").trim().replace(/\/$/, "");
  if (publicUrl) return `${publicUrl}/api/auth/reset-password?token=${encodeURIComponent(token)}`;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host") || "localhost:4010";
  return `${protocol}://${host}/api/auth/reset-password?token=${encodeURIComponent(token)}`;
}

function prunePasswordResetTokens(db) {
  const now = Date.now();
  db.passwordResetTokens = (db.passwordResetTokens || []).filter((item) => {
    const expiresAt = Date.parse(String(item?.expiresAt || ""));
    return !Number.isNaN(expiresAt) && expiresAt > now;
  });
}

function findValidResetToken(db, token) {
  prunePasswordResetTokens(db);
  const now = Date.now();

  return (db.passwordResetTokens || []).find((item) => {
    if (String(item?.token || "") !== String(token || "")) {
      return false;
    }

    const expiresAt = Date.parse(String(item?.expiresAt || ""));
    return !Number.isNaN(expiresAt) && expiresAt > now;
  });
}

function renderResetPasswordHtml(token, canReset) {
  const escapedToken = String(token || "").replace(/"/g, "&quot;");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>FixNow Password Reset</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(160deg, #fff7ee, #f7e1d0);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .card {
        width: min(440px, 100%);
        background: #fff;
        border: 1px solid #ead7c7;
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 12px 28px rgba(19, 29, 44, 0.08);
      }
      h1 { margin: 0 0 10px; font-size: 24px; color: #1c2430; }
      p { margin: 0 0 16px; color: #4e5d70; line-height: 1.45; }
      label { display: block; margin: 12px 0 6px; font-weight: 700; color: #1c2430; }
      input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d8dfe8;
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 15px;
      }
      button {
        margin-top: 16px;
        width: 100%;
        border: 0;
        border-radius: 12px;
        padding: 13px 14px;
        background: #9c341b;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      .status {
        margin-top: 12px;
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
      }
      .status.error { background: #ffe9e9; color: #a42a2a; border: 1px solid #f3b0b0; }
      .status.success { background: #e8f8ea; color: #22733b; border: 1px solid #a8e0b5; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Reset your password</h1>
      ${
        canReset
          ? "<p>Enter your new password below. After reset, use it when logging in from the FixNow app.</p>"
          : "<p>This reset link is invalid or expired. Please request a new password reset link from the app.</p>"
      }
      ${
        canReset
          ? `<form id="reset-form">
              <label for="password">New password</label>
              <input id="password" name="password" type="password" required minlength="8" />
              <label for="confirmPassword">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required minlength="8" />
              <button id="submit-button" type="submit">Submit new password</button>
              <div id="status" aria-live="polite"></div>
            </form>`
          : ""
      }
    </main>
    ${
      canReset
        ? `<script>
            const token = "${escapedToken}";
            const form = document.getElementById("reset-form");
            const status = document.getElementById("status");
            const submitButton = document.getElementById("submit-button");
            const setStatus = (message, kind) => {
              status.className = "status " + kind;
              status.textContent = message;
            };
            form.addEventListener("submit", async (event) => {
              event.preventDefault();
              const password = String(document.getElementById("password").value || "");
              const confirmPassword = String(document.getElementById("confirmPassword").value || "");

              if (!password || !confirmPassword) {
                setStatus("Please complete both password fields.", "error");
                return;
              }

              submitButton.disabled = true;
              try {
                const response = await fetch("/api/auth/reset-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token, password, confirmPassword })
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                  setStatus(payload.message || "Could not reset password. Try again.", "error");
                  return;
                }

                setStatus(
                  payload.message || "Your password has been reset. Go back to the login page in the app.",
                  "success"
                );
                form.reset();
              } catch (error) {
                setStatus("Could not contact the server. Please try again.", "error");
              } finally {
                submitButton.disabled = false;
              }
            });
          </script>`
        : ""
    }
  </body>
</html>`;
}

function signup(req, res) {
  const db = readDb();
  const profile = req.body.profile || {};
  const role = req.body.role;
  const password = String(req.body.password || "");
  const mechanicCredentials = req.body.credentials;
  const nextEmail = normalizeEmail(profile.email);

  if (!nextEmail || !password || !role) {
    res.status(400).json({ success: false, message: "Missing signup details." });
    return;
  }

  if (db.accounts.some((account) => normalizeEmail(account.profile.email) === nextEmail)) {
    res.json({ success: false, message: "That email is already registered. Please log in instead." });
    return;
  }

  if (db.accounts.some((account) => account.password === password)) {
    res.json({ success: false, message: "Choose a more unique password that is not already in use." });
    return;
  }

  const nextMechanicCredentials =
    role === "mechanic" && mechanicCredentials
      ? {
          ...mechanicCredentials,
          identificationNumber: String(mechanicCredentials.identificationNumber || "").trim() || undefined,
          identificationImage: persistAssetForAdmin(mechanicCredentials.identificationImage, "mechanic-id"),
          certificateDocument: persistAssetForAdmin(mechanicCredentials.certificateDocument, "mechanic-certificate")
        }
      : undefined;

  if (role === "mechanic") {
    if (
      (nextMechanicCredentials?.identificationImage && !hasServerStoredAsset(nextMechanicCredentials.identificationImage)) ||
      (nextMechanicCredentials?.certificateDocument && !hasServerStoredAsset(nextMechanicCredentials.certificateDocument))
    ) {
      res.status(400).json({
        success: false,
        message: "Could not store credential documents on the server. Please re-upload files and try again."
      });
      return;
    }
  }

  const nextAccount = {
    id: createAccountId(role),
    profile: {
      fullName: String(profile.fullName || "").trim(),
      email: nextEmail,
      phone: String(profile.phone || "").trim(),
      profilePhoto: profile.profilePhoto
    },
    role,
    password,
    approvalStatus: role === "mechanic" ? "pending" : "approved",
    createdAt: createCreatedAt(),
    mechanicCredentials: role === "mechanic" ? nextMechanicCredentials : undefined
  };

  db.accounts.push(nextAccount);
  writeDb(db);

  res.json({
    success: true,
    message:
      role === "mechanic"
        ? "Your mechanic signup request was sent to admin. You can log in after approval."
        : "Driver account created successfully.",
    account: nextAccount
  });
}

function login(req, res) {
  const db = readDb();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const account = db.accounts.find((item) => normalizeEmail(item.profile.email) === email);

  if (!account) {
    res.status(401).json({ success: false, message: "No account was found for that email." });
    return;
  }

  if (account.password !== password) {
    res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    return;
  }

  if (account.role === "mechanic" && account.approvalStatus !== "approved") {
    res.status(401).json({ success: false, message: "Your mechanic account is still waiting for admin approval." });
    return;
  }

  // Generate a simple token (in production, use JWT)
  const token = Buffer.from(`${account.id}:${account.password}`).toString("base64");

  res.json({
    success: true,
    message: "Login successful.",
    token,
    account,
    user: {
      id: account.id,
      email: account.profile.email,
      fullName: account.profile.fullName,
      role: account.role
    }
  });
}

async function forgotPassword(req, res) {
  const db = readDb();
  const email = normalizeEmail(req.body.email);

  if (!email) {
    res.status(400).json({ success: false, message: "Please enter your email address." });
    return;
  }

  const account = db.accounts.find((item) => normalizeEmail(item.profile.email) === email);

  if (!account) {
    res.status(404).json({
      success: false,
      message: "Email is unavailable. Please enter your correct email."
    });
    return;
  }

  prunePasswordResetTokens(db);
  db.passwordResetTokens = (db.passwordResetTokens || []).filter((item) => item.accountId !== account.id);

  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS).toISOString();

  db.passwordResetTokens.push({
    token,
    accountId: account.id,
    email,
    createdAt,
    expiresAt
  });
  writeDb(db);

  const resetLink = buildResetLink(req, token);
  try {
    const result = await sendPasswordResetEmail({
      email,
      fullName: account.profile?.fullName,
      resetLink
    });

    if (!result.success) {
      if (result.reason === "missing_smtp_config") {
        if (isLocalFallbackAllowed()) {
          res.json({
            success: true,
            message: "Email service is not configured. Open the reset link directly to continue.",
            resetLink
          });
          return;
        }

        db.passwordResetTokens = (db.passwordResetTokens || []).filter((item) => item.token !== token);
        writeDb(db);

        res.status(500).json({
          success: false,
          message: "Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM."
        });
        return;
      }

      db.passwordResetTokens = (db.passwordResetTokens || []).filter((item) => item.token !== token);
      writeDb(db);

      res.status(500).json({
        success: false,
        message: "Could not send reset email right now. Please try again."
      });
      return;
    }
  } catch (error) {
    if (isLocalFallbackAllowed()) {
      res.json({
        success: true,
        message: "Could not send email right now. Open the reset link directly to continue.",
        resetLink
      });
      return;
    }

    db.passwordResetTokens = (db.passwordResetTokens || []).filter((item) => item.token !== token);
    writeDb(db);

    res.status(500).json({ success: false, message: "Could not send reset email right now. Please try again." });
    return;
  }

  res.json({
    success: true,
    message: "Password reset link has been sent. Check your email and open the link to reset your password."
  });
}

function getResetPasswordPage(req, res) {
  const token = String(req.query.token || "").trim();
  const db = readDb();
  const beforeCount = (db.passwordResetTokens || []).length;
  const resetRecord = findValidResetToken(db, token);
  const afterCount = (db.passwordResetTokens || []).length;

  if (afterCount !== beforeCount) {
    writeDb(db);
  }

  res.status(resetRecord ? 200 : 400).send(renderResetPasswordHtml(token, Boolean(resetRecord)));
}

function resetPassword(req, res) {
  const token = String(req.body.token || "").trim();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!token) {
    res.status(400).json({ success: false, message: "Reset token is missing." });
    return;
  }

  if (!password.trim() || !confirmPassword.trim()) {
    res.status(400).json({ success: false, message: "Please enter and confirm your new password." });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ success: false, message: "Passwords do not match. Please try again." });
    return;
  }

  if (!isValidResetPassword(password)) {
    res.status(400).json({ success: false, message: "Use a password with at least 8 characters." });
    return;
  }

  const db = readDb();
  const resetRecord = findValidResetToken(db, token);

  if (!resetRecord) {
    writeDb(db);
    res.status(400).json({ success: false, message: "Reset link is invalid or expired. Please request a new one." });
    return;
  }

  const accountIndex = db.accounts.findIndex((item) => item.id === resetRecord.accountId);

  if (accountIndex < 0) {
    db.passwordResetTokens = (db.passwordResetTokens || []).filter((item) => item.token !== token);
    writeDb(db);
    res.status(404).json({ success: false, message: "Account was not found for this reset link." });
    return;
  }

  db.accounts[accountIndex] = {
    ...db.accounts[accountIndex],
    password: password.trim()
  };
  db.passwordResetTokens = (db.passwordResetTokens || []).filter((item) => item.accountId !== resetRecord.accountId);
  writeDb(db);

  res.json({
    success: true,
    message: "Your password has been reset. Go back to the login page in the app."
  });
}

module.exports = {
  signup,
  login,
  forgotPassword,
  getResetPasswordPage,
  resetPassword
};
