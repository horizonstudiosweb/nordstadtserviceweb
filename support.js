const supportSettings = {
  enabled: true,
  storageKey: "nordstadt_support_demo_tickets",
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  discordFunctionName: "notify-discord-ticket",
  adminPanelPath: "admin.html",
  ticketPortalPath: "tickets.html"
};

let supportSupabaseClient = null;
let supportBackendReady = false;

function supportEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function supportIcon(name) {
  const icons = {
    chat: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.75 5.75A3 3 0 0 1 7.75 2.75h8.5a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3H10.2l-4.1 3.35a.85.85 0 0 1-1.35-.66v-3.02a3 3 0 0 1-2-2.82V5.75Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    `,
    close: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    `
  };

  return icons[name] || icons.chat;
}

function supportLoadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);

    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function supportSetupSupabase() {
  try {
    await supportLoadScript("supabase-config.js");
    await supportLoadScript(supportSettings.supabaseJsUrl);

    const config = window.NordstadtSupabaseConfig?.getConfig?.();

    if (!config || !config.enabled || !config.url || !config.anonKey) {
      supportBackendReady = false;
      return;
    }

    supportSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
    supportBackendReady = true;
  } catch (error) {
    supportBackendReady = false;
  }
}

function supportCreateTicketNumber() {
  return `NRP-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

function supportGetTicketPortalUrl(ticketNumber, discordName) {
  const url = new URL(supportSettings.ticketPortalPath, window.location.href);
  url.searchParams.set("ticket", ticketNumber);
  url.searchParams.set("discord", discordName);
  return url.href;
}

function supportGetAdminUrl(ticketNumber) {
  const url = new URL(supportSettings.adminPanelPath, window.location.href);
  url.searchParams.set("ticket", ticketNumber);
  return url.href;
}

function supportSaveDemoTicket(ticket) {
  const saved = JSON.parse(localStorage.getItem(supportSettings.storageKey) || "[]");
  saved.unshift(ticket);
  localStorage.setItem(supportSettings.storageKey, JSON.stringify(saved));
}

async function supportSaveSupabaseTicket(ticket) {
  const supabaseTicket = {
    ticket_number: ticket.id,
    category: ticket.category,
    category_label: ticket.categoryLabel,
    discord_username: ticket.discordUsername,
    rank: ticket.rank || null,
    title: ticket.title,
    description: ticket.description,
    application_area: ticket.applicationArea || null,
    target_user: ticket.targetUser || null,
    proof: ticket.proof || null,
    reproduce: ticket.reproduce || null,
    status: "open"
  };

  const { error } = await supportSupabaseClient
    .from("tickets")
    .insert(supabaseTicket);

  if (error) {
    throw new Error(error.message || "Ticket konnte nicht gespeichert werden.");
  }

  await supportSupabaseClient.rpc("send_public_ticket_message", {
    p_ticket_number: ticket.id,
    p_discord_username: ticket.discordUsername,
    p_message_text: ticket.description
  });
}

async function supportNotifyDiscord(ticket) {
  if (!supportSupabaseClient) return false;

  const payload = {
    ticket_number: ticket.id,
    category: ticket.category,
    category_label: ticket.categoryLabel,
    discord_username: ticket.discordUsername,
    title: ticket.title,
    description: ticket.description,
    admin_url: supportGetAdminUrl(ticket.id)
  };

  const { error } = await supportSupabaseClient.functions.invoke(
    supportSettings.discordFunctionName,
    {
      body: payload
    }
  );

  if (error) {
    console.warn("Discord notification failed:", error);
    return false;
  }

  return true;
}

function supportBuildWidget() {
  const root = document.createElement("div");
  root.className = "support-widget-root";
  root.innerHTML = `
    <button class="support-launcher" id="supportLauncher" type="button">
      <span class="support-launcher-icon">${supportIcon("chat")}</span>
      <span>
        <strong>Brauchst du Hilfe?</strong>
        <small>Support & Meldungen</small>
      </span>
    </button>

    <div class="support-panel" id="supportPanel">
      <div class="support-panel-header">
        <div class="support-panel-title">
          <span>${supportIcon("chat")}</span>
          <div>
            <h3>Nordstadt Support</h3>
            <p>FAQ, Tickets, Bewerbungen, Reports und Bugmeldungen.</p>
          </div>
        </div>
        <button class="support-close" id="supportClose" type="button">${supportIcon("close")}</button>
      </div>

      <div class="support-quick-links">
        <a href="tickets.html">Meine Tickets</a>
        <a href="admin.html">Admin</a>
      </div>

      <form class="support-form" id="supportForm">
        <label>
          Kategorie
          <select id="supportCategory" required>
            <option value="support" data-label="Allgemeiner Support">Allgemeiner Support</option>
            <option value="application" data-label="Bewerbung">Bewerbung</option>
            <option value="report" data-label="Spieler melden">Spieler melden</option>
            <option value="bug" data-label="Bug melden">Bug melden</option>
          </select>
        </label>

        <label>
          Discord-Name
          <input id="supportDiscord" type="text" placeholder="z. B. deinname#0000" required />
        </label>

        <label>
          Rang / Rolle
          <input id="supportRank" type="text" placeholder="z. B. Spieler, Tester, Supporter" />
        </label>

        <label>
          Titel
          <input id="supportTitle" type="text" placeholder="Kurzer Betreff" required />
        </label>

        <label class="support-field application-field hidden">
          Bewerbungsbereich
          <input id="supportApplicationArea" type="text" placeholder="z. B. Administrator, Leitung, Support" />
        </label>

        <label class="support-field report-field hidden">
          Gemeldeter User
          <input id="supportTargetUser" type="text" placeholder="Name des Spielers" />
        </label>

        <label class="support-field report-field bug-field hidden">
          Beweise / Link
          <input id="supportProof" type="text" placeholder="Screenshot, Video oder Link" />
        </label>

        <label class="support-field bug-field hidden">
          Schritte zum Reproduzieren
          <input id="supportReproduce" type="text" placeholder="Was muss man tun, damit der Fehler passiert?" />
        </label>

        <label>
          Beschreibung
          <textarea id="supportDescription" placeholder="Beschreibe dein Anliegen genau..." required></textarea>
        </label>

        <div class="support-buttons">
          <button type="submit">Ticket erstellen</button>
          <button type="button" id="supportCancel">Abbrechen</button>
        </div>

        <div class="support-message" id="supportMessage"></div>
      </form>
    </div>
  `;

  document.body.appendChild(root);
}

function supportSetMessage(text, type = "") {
  const message = document.getElementById("supportMessage");
  if (!message) return;

  message.className = `support-message ${type}`.trim();
  message.innerHTML = text;
}

function supportToggleFields() {
  const category = document.getElementById("supportCategory")?.value;

  document.querySelectorAll(".application-field").forEach((field) => {
    field.classList.toggle("hidden", category !== "application");
  });

  document.querySelectorAll(".report-field").forEach((field) => {
    field.classList.toggle("hidden", category !== "report");
  });

  document.querySelectorAll(".bug-field").forEach((field) => {
    field.classList.toggle("hidden", category !== "bug");
  });
}

function supportSetupEvents() {
  const launcher = document.getElementById("supportLauncher");
  const panel = document.getElementById("supportPanel");
  const close = document.getElementById("supportClose");
  const cancel = document.getElementById("supportCancel");
  const form = document.getElementById("supportForm");
  const category = document.getElementById("supportCategory");

  launcher.addEventListener("click", () => {
    panel.classList.add("open");
  });

  close.addEventListener("click", () => {
    panel.classList.remove("open");
  });

  cancel.addEventListener("click", () => {
    panel.classList.remove("open");
  });

  category.addEventListener("change", supportToggleFields);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const selectedOption = category.options[category.selectedIndex];

    const ticket = {
      id: supportCreateTicketNumber(),
      category: category.value,
      categoryLabel: selectedOption.dataset.label || selectedOption.textContent,
      discordUsername: document.getElementById("supportDiscord").value.trim(),
      rank: document.getElementById("supportRank").value.trim(),
      title: document.getElementById("supportTitle").value.trim(),
      applicationArea: document.getElementById("supportApplicationArea").value.trim(),
      targetUser: document.getElementById("supportTargetUser").value.trim(),
      proof: document.getElementById("supportProof").value.trim(),
      reproduce: document.getElementById("supportReproduce").value.trim(),
      description: document.getElementById("supportDescription").value.trim(),
      createdAt: new Date().toISOString(),
      status: "open"
    };

    if (!ticket.discordUsername || !ticket.title || !ticket.description) {
      supportSetMessage("Bitte fülle alle Pflichtfelder aus.", "error");
      return;
    }

    supportSetMessage("Ticket wird erstellt...");

    try {
      let discordSent = false;

      if (supportBackendReady) {
        await supportSaveSupabaseTicket(ticket);
        discordSent = await supportNotifyDiscord(ticket);
      } else {
        supportSaveDemoTicket(ticket);
      }

      const portalUrl = supportGetTicketPortalUrl(ticket.id, ticket.discordUsername);

      form.reset();
      supportToggleFields();

      supportSetMessage(`
        <strong>Ticket erstellt.</strong><br>
        Deine Ticketnummer: <strong>${supportEscape(ticket.id)}</strong><br>
        <a href="${supportEscape(portalUrl)}">Ticket öffnen und Antworten lesen</a>
        ${discordSent ? "<br>Discord wurde benachrichtigt." : "<br>Discord-Benachrichtigung konnte nicht bestätigt werden."}
      `, "success");
    } catch (error) {
      supportSetMessage(`Ticket konnte nicht vollständig verarbeitet werden: ${supportEscape(error.message)}`, "error");
    }
  });
}

(async function initSupportWidget() {
  if (!supportSettings.enabled) return;

  supportBuildWidget();
  supportSetupEvents();
  supportToggleFields();
  await supportSetupSupabase();
})();
