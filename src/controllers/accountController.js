const { readDb, writeDb } = require("../data/database");

function withoutEmbeddedDocumentData(asset) {
  if (!asset || typeof asset !== "object") {
    return asset;
  }

  const { webUri, ...metadata } = asset;
  return {
    ...metadata,
    ...(typeof webUri === "string" && !webUri.startsWith("data:") ? { webUri } : {})
  };
}

function toAccountListItem(account) {
  if (!account.mechanicCredentials) {
    return account;
  }

  return {
    ...account,
    mechanicCredentials: {
      ...account.mechanicCredentials,
      identificationImage: withoutEmbeddedDocumentData(account.mechanicCredentials.identificationImage),
      certificateDocument: withoutEmbeddedDocumentData(account.mechanicCredentials.certificateDocument)
    }
  };
}

function listAccounts(req, res) {
  const db = readDb();
  res.json({ accounts: db.accounts.map(toAccountListItem) });
}

function getAccountById(req, res) {
  const db = readDb();
  const account = db.accounts.find((item) => item.id === req.params.accountId);

  if (!account) {
    res.status(404).json({ success: false, message: "Account not found." });
    return;
  }

  res.json({ account });
}

function updateAccountLocation(req, res) {
  const db = readDb();
  let updatedAccount;

  db.accounts = db.accounts.map((account) => {
    if (account.id !== req.params.accountId) {
      return account;
    }

    updatedAccount = {
      ...account,
      lastKnownLocation: {
        latitude: Number(req.body.latitude || 0),
        longitude: Number(req.body.longitude || 0),
        label: typeof req.body.label === "string" ? req.body.label.trim() : undefined,
        updatedAt: new Date().toISOString()
      }
    };

    return updatedAccount;
  });

  if (!updatedAccount) {
    res.status(404).json({ success: false, message: "Account not found." });
    return;
  }

  writeDb(db);
  res.json({ success: true, account: updatedAccount });
}

function updateAccountTransportMode(req, res) {
  const db = readDb();
  const allowedTransportModes = ["walking", "bicycle", "motorcycle", "car", "tow-truck"];
  const nextTransportMode = typeof req.body.transportMode === "string" ? req.body.transportMode.trim() : "";
  let updatedAccount;

  if (!allowedTransportModes.includes(nextTransportMode)) {
    res.status(400).json({ success: false, message: "Invalid mechanic transport mode." });
    return;
  }

  db.accounts = db.accounts.map((account) => {
    if (account.id !== req.params.accountId) {
      return account;
    }

    if (account.role !== "mechanic" || !account.mechanicCredentials) {
      updatedAccount = undefined;
      return account;
    }

    updatedAccount = {
      ...account,
      mechanicCredentials: {
        ...account.mechanicCredentials,
        transportMode: nextTransportMode
      }
    };

    return updatedAccount;
  });

  if (!updatedAccount) {
    res.status(404).json({ success: false, message: "Mechanic account not found." });
    return;
  }

  writeDb(db);
  res.json({ success: true, account: updatedAccount });
}

module.exports = {
  listAccounts,
  getAccountById,
  updateAccountLocation,
  updateAccountTransportMode
};
