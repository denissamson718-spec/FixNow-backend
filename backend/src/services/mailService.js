const nodemailer = require("nodemailer");

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSecure(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const port = parsePort(process.env.SMTP_PORT, 587);
  const secure = parseSecure(process.env.SMTP_SECURE, port === 465);

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  };
}

async function sendPasswordResetEmail({ email, fullName, resetLink }) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    return {
      success: false,
      reason: "missing_smtp_config"
    };
  }

  const from = String(process.env.SMTP_FROM || smtpConfig.auth.user).trim();
  const appName = String(process.env.APP_NAME || "FixNow").trim();
  const greetingName = String(fullName || "").trim() || "there";

  const transporter = nodemailer.createTransport(smtpConfig);
  await transporter.sendMail({
    from,
    to: email,
    subject: `${appName} password reset`,
    text: `Hello ${greetingName},\n\nUse this link to reset your password:\n${resetLink}\n\nThis link expires in 30 minutes.\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">
        <h2 style="margin:0 0 12px">Reset your ${appName} password</h2>
        <p>Hello ${greetingName},</p>
        <p>Click the button below to set a new password. This link expires in 30 minutes.</p>
        <p style="margin:20px 0">
          <a href="${resetLink}" style="display:inline-block;background:#9c341b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
            Reset password
          </a>
        </p>
        <p>If the button does not work, open this link manually:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `
  });

  return {
    success: true
  };
}

module.exports = {
  sendPasswordResetEmail
};
