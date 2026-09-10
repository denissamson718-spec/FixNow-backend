(function () {
  let lastSyncText = "Waiting for first sync...";

  async function fetchOverview() {
    const response = await fetch("/api/admin/overview");
    return response.json();
  }

  function initials(name) {
    return name
      .split(" ")
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function avatarMarkup(account) {
    if (account.profile?.profilePhoto?.uri) {
      return `<img class="avatar" src="${account.profile.profilePhoto.uri}" alt="${account.profile.fullName}" />`;
    }

    return `<div class="avatar-fallback">${initials(account.profile.fullName)}</div>`;
  }

  function pendingMechanicCard(account) {
    return `
      <article class="account-card">
        <div class="account-top">
          <div class="identity">
            ${avatarMarkup(account)}
            <div class="identity-copy">
              <h3 class="account-name">${account.profile.fullName}</h3>
              <p class="account-meta">${account.profile.email}</p>
              <p class="account-meta">${account.profile.phone}</p>
              <p class="account-meta">Submitted ${account.createdAt}</p>
            </div>
          </div>
          <span class="badge pending">Pending</span>
        </div>
        <div class="details">
          <div class="detail">
            <span class="detail-label">Login email</span>
            <div class="detail-value">${account.profile.email}</div>
          </div>
          <div class="detail">
            <span class="detail-label">Login password</span>
            <div class="detail-value">${account.password}</div>
          </div>
          <div class="detail">
            <span class="detail-label">ID type</span>
            <div class="detail-value">${account.mechanicCredentials?.identificationType ?? "--"}</div>
          </div>
          <div class="detail">
            <span class="detail-label">ID file</span>
            <div class="detail-value">${account.mechanicCredentials?.identificationImage?.fileName ?? "Uploaded image"}</div>
          </div>
          <div class="detail">
            <span class="detail-label">Certificate</span>
            <div class="detail-value">${account.mechanicCredentials?.certificateDocument?.fileName ?? "Uploaded file"}</div>
          </div>
          <div class="detail">
            <span class="detail-label">Experience</span>
            <div class="detail-value">${account.mechanicCredentials?.experienceYears ?? "--"}</div>
          </div>
          <div class="detail">
            <span class="detail-label">Working garage</span>
            <div class="detail-value">${account.mechanicCredentials?.workingGarage || "--"}</div>
          </div>
          <div class="detail">
            <span class="detail-label">Garage location</span>
            <div class="detail-value">${account.mechanicCredentials?.garageLocation || "--"}</div>
          </div>
        </div>
        <button class="approve-btn" data-approve-id="${account.id}">Approve mechanic</button>
      </article>
    `;
  }

  function listRow(account, isMechanic) {
    const badgeClass = isMechanic
      ? account.approvalStatus === "approved"
        ? "approved"
        : "pending"
      : "approved";
    const badgeText = isMechanic
      ? account.approvalStatus === "approved"
        ? "Approved"
        : "Pending"
      : "Active";

    return `
      <div class="list-row">
        <div>
          <h3 class="account-name">${account.profile.fullName}</h3>
          <p class="account-meta">${account.profile.email}</p>
          <p class="account-meta">Password: ${account.password}</p>
          <p class="account-meta">${account.profile.phone}</p>
          ${
            isMechanic
              ? `<p class="account-meta">${account.mechanicCredentials?.workingGarage || "No garage listed"}</p>`
              : ""
          }
          <p class="account-meta">Created ${account.createdAt}</p>
        </div>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
  }

  async function approveMechanic(id) {
    await fetch(`/api/admin/approve/${id}`, {
      method: "POST"
    });
  }

  function renderShell({ drivers, mechanics, pendingMechanics, errorMessage }) {
    document.getElementById("app").innerHTML = `
      <main class="page">
        <section class="hero">
          <div>
            <p class="kicker">FixNow Admin Web</p>
            <h1 class="title">Approve mechanic signup requests and review all users.</h1>
            <p class="subtitle">
              This dashboard now reads the same shared account data used by the FixNow mobile app and refreshes automatically.
            </p>
            <div class="note">
              Run <strong>npm run admin-server</strong>, then open <strong>http://localhost:4010/admin/</strong>.
              New mechanic signup requests from the app appear here automatically every few seconds.
            </div>
            <div class="note">
              Last sync: ${lastSyncText}
            </div>
            ${errorMessage ? `<div class="note error-note">${errorMessage}</div>` : ""}
          </div>
          <div class="stats">
            <div class="stat-card">
              <p class="stat-value">${drivers.length}</p>
              <p class="stat-label">Drivers</p>
            </div>
            <div class="stat-card">
              <p class="stat-value">${mechanics.length}</p>
              <p class="stat-label">Mechanics</p>
            </div>
            <div class="stat-card">
              <p class="stat-value">${pendingMechanics.length}</p>
              <p class="stat-label">Pending approvals</p>
            </div>
          </div>
        </section>

        <section class="layout">
          <section class="panel">
            <h2 class="panel-title">Pending mechanic approvals</h2>
            <p class="panel-text">
              Review mechanic details, credentials, garage information, and uploaded-file names before approval.
            </p>
            <div class="stack">
              ${
                pendingMechanics.length
                  ? pendingMechanics.map(pendingMechanicCard).join("")
                  : `<div class="empty">No pending mechanic signup requests right now.</div>`
              }
            </div>
          </section>

          <section class="panel">
            <h2 class="panel-title">All drivers</h2>
            <p class="panel-text">Drivers do not need approval, but you can still review their account details.</p>
            <div class="stack">
              ${
                drivers.length
                  ? drivers.map((driver) => listRow(driver, false)).join("")
                  : `<div class="empty">No driver accounts found.</div>`
              }
            </div>
          </section>

          <section class="panel">
            <h2 class="panel-title">All mechanics</h2>
            <p class="panel-text">See every mechanic signup and its current approval status.</p>
            <div class="stack">
              ${
                mechanics.length
                  ? mechanics.map((mechanic) => listRow(mechanic, true)).join("")
                  : `<div class="empty">No mechanic accounts found.</div>`
              }
            </div>
          </section>
        </section>
      </main>
    `;

    document.querySelectorAll("[data-approve-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-approve-id");

        if (!id) {
          return;
        }

        button.disabled = true;
        button.textContent = "Approving...";

        try {
          await approveMechanic(id);
          lastSyncText = `Approved mechanic at ${new Date().toLocaleTimeString()}`;
        } catch (error) {
          lastSyncText = `Approval failed at ${new Date().toLocaleTimeString()}`;
        }

        render();
      });
    });
  }

  async function render() {
    try {
      const overview = await fetchOverview();
      const drivers = Array.isArray(overview.drivers) ? overview.drivers : [];
      const mechanics = Array.isArray(overview.mechanics) ? overview.mechanics : [];
      const pendingMechanics = Array.isArray(overview.pendingMechanics) ? overview.pendingMechanics : [];

      lastSyncText = new Date().toLocaleTimeString();
      renderShell({
        drivers,
        mechanics,
        pendingMechanics
      });
    } catch (error) {
      renderShell({
        drivers: [],
        mechanics: [],
        pendingMechanics: [],
        errorMessage:
          "Dashboard could not reach the FixNow admin server. Start it with npm run admin-server, then refresh this page."
      });
    }
  }

  render();
  setInterval(render, 3000);
})();
