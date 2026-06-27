const supportSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  ticketPortalPath: "tickets.html",
  adminPath: "admin.html",
  discordFunctionName: "notify-discord-ticket",
  categories: {
    support: {
      label: "Allgemeiner Support",
      description: "Fragen, Hilfe, Probleme oder sonstige Anliegen."
    },
    application: {
      label: "Bewerbung",
      description: "Bewerbungen für Team, Leitung oder Fraktionen."
    },
    report: {
      label: "Spieler melden",
      description: "Melde Regelverstöße mit Beweisen."
    },
    bug: {
      label: "Bug melden",
      description: "Technische Fehler, Bugs oder Probleme im Spiel."
    }
  }
};

let supportSupabaseClient = null;
let supportSupabaseReady = false;

function supportEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function supportCreateIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a8.5 8.5 0 0 0-8.5 8.5v3.35A3.15 3.15 0 0 0 6.65 17H8a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H6.65c-.39 0-.76.07-1.1.2A6.5 6.5 0 0 1 18.45 10.2c-.34-.13-.71-.2-1.1-.2H16a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.35c.2 0 .4-.02.58-.06-.5 1.18-1.65 2.06-3.43 2.06H13.8a2 2 0 0 0-1.8-1.1h-1.1a2 2 0 1 0 0 4h1.1a2 2 0 0 0 1.72-.98h.78c3.35 0 5.5-2.1 5.95-5.1A3.14 3.14 0 0 0 20.5 13.85V10.5A8.5 8.5 0 0 0 12 2Z"
      ></path>
    </svg>
  `;
}

function supportLoadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} konnte nicht geladen werden.`));
    document.head.appendChild(script);
  });
}

async function supportSetupSupabase() {
  if (supportSupabaseReady) {
    return true;
  }

  try {
    await supportLoadScript("supabase-config.js");
    await supportLoadScript(supportSettings.supabaseJsUrl);

    const config = window.NordstadtSupabaseConfig?.getConfig?.();

    if (!config || !config.enabled || !config.url || !config.anonKey) {
      return false;
    }

    supportSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
    supportSupabaseReady = true;

    return true;
  } catch (error) {
    console.warn("Supabase konnte nicht geladen werden:", error);
    return false;
  }
}

function supportGenerateTicketNumber() {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();

  return `NRP-${timePart}${randomPart}`;
}

function supportGetCategoryLabel(category) {
  return supportSettings.categories[category]?.label || "Support";
}

function supportGetTicketPortalUrl(ticketNumber, discordUsername) {
  const url = new URL(supportSettings.ticketPortalPath, window.location.href);

  url.searchParams.set("ticket", ticketNumber);
  url.searchParams.set("discord", discordUsername);

  return url.toString();
}

function supportGetAdminTicketUrl(ticketNumber) {
  const url = new URL(supportSettings.adminPath, window.location.href);

  url.searchParams.set("ticket", ticketNumber);

  return url.toString();
}

function supportCreateWidget() {
  const root = document.createElement("div");
  root.className = "support-widget-root";
  root.innerHTML = `
    <button class="support-launcher" id="supportLauncher" type="button" aria-label="Support öffnen">
      <span class="support-launcher-icon">${supportCreateIcon()}</span>
      <span>
        <strong>Support</strong>
        <small>Ticket erstellen</small>
      </span>
    </button>

    <section class="support-panel" id="supportPanel" aria-label="Support Ticket">
      <div class="support-panel-header">
        <div class="support-panel-title">
          <span>${supportCreateIcon()}</span>
          <div>
            <h3>Nordstadt Support</h3>
            <p>Erstelle ein Ticket. Antworten findest du danach im Ticketportal.</p>
          </div>
        </div>

        <button class="support-close" id="supportClose" type="button" aria-label="Support schließen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z"></path>
          </svg>
        </button>
      </div>

      <div class="support-quick-links">
        <a href="${supportEscape(supportSettings.ticketPortalPath)}">Meine Tickets</a>
        <a href="${supportEscape(supportSettings.adminPath)}">Admin</a>
      </div>

      <form class="support-form" id="supportForm">
        <label>
          Kategorie
          <select id="supportCategory" required>
            <option value="support">Allgemeiner Support</option>
            <option value="application">Bewerbung</option>
            <option value="report">Spieler melden</option>
            <option value="bug">Bug melden</option>
          </select>
        </label>

        <label>
          Discord-Name
          <input id="supportDiscord" type="text" placeholder="z. B. deinname#0000" autocomplete="off" required />
        </label>

        <label>
          Rang / Rolle
          <input id="supportRank" type="text" placeholder="z. B. Spieler, Moderator, Fraktion..." autocomplete="off" />
        </label>

        <label>
          Titel
          <input id="supportTitle" type="text" placeholder="Kurzer Titel deines Anliegens" autocomplete="off" required />
        </label>

        <label>
          Beschreibung
          <textarea id="supportDescription" placeholder="Beschreibe dein Anliegen so genau wie möglich..." required></textarea>
        </label>

        <label class="support-field hidden" id="applicationAreaField">
          Bewerbungsbereich
          <input id="supportApplicationArea" type="text" placeholder="z. B. Team, Leitung, Bundespolizei..." autocomplete="off" />
        </label>

        <label class="support-field hidden" id="targetUserField">
          Gemeldeter User
          <input id="supportTargetUser" type="text" placeholder="Name des Users" autocomplete="off" />
        </label>

        <label class="support-field hidden" id="proofField">
          Beweise / Links
          <textarea id="supportProof" placeholder="Screenshots, Videos, Clips oder sonstige Beweise..."></textarea>
        </label>

        <label class="support-field hidden" id="reproduceField">
          Schritte zum Reproduzieren
          <textarea id="supportReproduce" placeholder="Wie kann man den Bug nachstellen?"></textarea>
        </label>

        <div class="support-buttons">
          <button type="submit">Ticket erstellen</button>
          <button type="button" id="supportReset">Zurücksetzen</button>
        </div>

        <div id="supportMessage" class="support-message"></div>
      </form>
    </section>
  `;

  document.body.appendChild(root);

  return root;
}

function supportSetMessage(messageElement, text, type = "") {
  messageElement.innerHTML = text || "";
  messageElement.className = `support-message ${type}`.trim();
}

function supportUpdateCategoryFields(root) {
  const category = root.querySelector("#supportCategory").value;

  const applicationAreaField = root.querySelector("#applicationAreaField");
  const targetUserField = root.querySelector("#targetUserField");
  const proofField = root.querySelector("#proofField");
  const reproduceField = root.querySelector("#reproduceField");

  applicationAreaField.classList.toggle("hidden", category !== "application");
  targetUserField.classList.toggle("hidden", category !== "report");
  proofField.classList.toggle("hidden", category !== "report");
  reproduceField.classList.toggle("hidden", category !== "bug");
}

function supportReadForm(root) {
  const category = root.querySelector("#supportCategory").value.trim();
  const discordUsername = root.querySelector("#supportDiscord").value.trim();
  const rank = root.querySelector("#supportRank").value.trim();
  const title = root.querySelector("#supportTitle").value.trim();
  const description = root.querySelector("#supportDescription").value.trim();
  const applicationArea = root.querySelector("#supportApplicationArea").value.trim();
  const targetUser = root.querySelector("#supportTargetUser").value.trim();
  const proof = root.querySelector("#supportProof").value.trim();
  const reproduce = root.querySelector("#supportReproduce").value.trim();

  return {
    ticket_number: supportGenerateTicketNumber(),
    category,
    category_label: supportGetCategoryLabel(category),
    discord_username: discordUsername,
    rank,
    title,
    description,
    application_area: applicationArea,
    target_user: targetUser,
    proof,
    reproduce,
    status: "open"
  };
}

function supportValidateTicket(ticket) {
  if (!ticket.discord_username) {
    return "Bitte gib deinen Discord-Namen an.";
  }

  if (!ticket.title || ticket.title.length < 3) {
    return "Bitte gib einen richtigen Titel an.";
  }

  if (!ticket.description || ticket.description.length < 10) {
    return "Bitte beschreibe dein Anliegen genauer.";
  }

  if (ticket.category === "application" && !ticket.application_area) {
    return "Bitte gib an, für welchen Bereich du dich bewirbst.";
  }

  if (ticket.category === "report" && !ticket.target_user) {
    return "Bitte gib an, welchen User du melden möchtest.";
  }

  if (ticket.category === "report" && !ticket.proof) {
    return "Bitte gib Beweise oder Links zur Meldung an.";
  }

  if (ticket.category === "bug" && !ticket.reproduce) {
    return "Bitte beschreibe, wie man den Bug reproduzieren kann.";
  }

  return "";
}

async function supportCreateInitialMessage(ticket) {
  if (!supportSupabaseClient) {
    return;
  }

  const { data, error } = await supportSupabaseClient.rpc("send_public_ticket_message", {
    p_ticket_number: ticket.ticket_number,
    p_discord_username: ticket.discord_username,
    p_message_text: ticket.description
  });

  if (error || !data || data.success !== true) {
    console.warn("Initiale Ticket-Nachricht konnte nicht erstellt werden:", error || data);
  }
}

async function supportSaveSupabaseTicket(ticket) {
  if (!supportSupabaseClient) {
    throw new Error("Supabase ist nicht verbunden.");
  }

  const { data, error } = await supportSupabaseClient
    .from("tickets")
    .insert(ticket)
    .select("id,ticket_number")
    .single();

  if (error) {
    throw new Error(error.message || "Ticket konnte nicht gespeichert werden.");
  }

  await supportCreateInitialMessage(ticket);

  return data;
}

async function supportNotifyDiscord(ticket) {
  if (!supportSupabaseClient) {
    return {
      success: false,
      skipped: true
    };
  }

  const adminUrl = supportGetAdminTicketUrl(ticket.ticket_number);
  const portalUrl = supportGetTicketPortalUrl(ticket.ticket_number, ticket.discord_username);

  try {
    const { data, error } = await supportSupabaseClient.functions.invoke(
      supportSettings.discordFunctionName,
      {
        body: {
          ticket_number: ticket.ticket_number,
          category: ticket.category,
          category_label: ticket.category_label,
          discord_username: ticket.discord_username,
          rank: ticket.rank,
          title: ticket.title,
          description: ticket.description,
          application_area: ticket.application_area,
          target_user: ticket.target_user,
          proof: ticket.proof,
          reproduce: ticket.reproduce,
          admin_url: adminUrl,
          portal_url: portalUrl
        }
      }
    );

    if (error) {
      return {
        success: false,
        error
      };
    }

    return data || {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error
    };
  }
}

function supportResetForm(root) {
  const form = root.querySelector("#supportForm");

  form.reset();
  supportUpdateCategoryFields(root);

  const messageElement = root.querySelector("#supportMessage");
  supportSetMessage(messageElement, "");
}

async function supportHandleSubmit(root, event) {
  event.preventDefault();

  const messageElement = root.querySelector("#supportMessage");
  const submitButton = root.querySelector('button[type="submit"]');

  const isReady = await supportSetupSupabase();

  if (!isReady) {
    supportSetMessage(
      messageElement,
      "Supabase ist nicht aktiv. Prüfe supabase-config.js.",
      "error"
    );
    return;
  }

  const ticket = supportReadForm(root);
  const validationError = supportValidateTicket(ticket);

  if (validationError) {
    supportSetMessage(messageElement, validationError, "error");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Ticket wird erstellt...";

    const savedTicket = await supportSaveSupabaseTicket(ticket);
    const discordResult = await supportNotifyDiscord(ticket);

    const portalUrl = supportGetTicketPortalUrl(ticket.ticket_number, ticket.discord_username);

    let discordNotice = "";

    if (!discordResult || discordResult.success !== true) {
      discordNotice = "<br>Discord-Benachrichtigung konnte nicht bestätigt werden. Das Ticket wurde trotzdem gespeichert.";
    }

    supportSetMessage(
      messageElement,
      `
        Ticket wurde erstellt.<br>
        <strong>Ticketnummer:</strong> ${supportEscape(savedTicket.ticket_number || ticket.ticket_number)}<br>
        <a href="${supportEscape(portalUrl)}">Ticket öffnen und Antworten lesen</a>
        ${discordNotice}
      `,
      "success"
    );

    root.querySelector("#supportTitle").value = "";
    root.querySelector("#supportDescription").value = "";
    root.querySelector("#supportApplicationArea").value = "";
    root.querySelector("#supportTargetUser").value = "";
    root.querySelector("#supportProof").value = "";
    root.querySelector("#supportReproduce").value = "";
  } catch (error) {
    supportSetMessage(messageElement, error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ticket erstellen";
  }
}

function supportBindWidget(root) {
  const launcher = root.querySelector("#supportLauncher");
  const panel = root.querySelector("#supportPanel");
  const closeButton = root.querySelector("#supportClose");
  const form = root.querySelector("#supportForm");
  const category = root.querySelector("#supportCategory");
  const resetButton = root.querySelector("#supportReset");

  launcher.addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  closeButton.addEventListener("click", () => {
    panel.classList.remove("open");
  });

  category.addEventListener("change", () => {
    supportUpdateCategoryFields(root);
  });

  resetButton.addEventListener("click", () => {
    supportResetForm(root);
  });

  form.addEventListener("submit", async (event) => {
    await supportHandleSubmit(root, event);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      panel.classList.remove("open");
    }
  });
}

(async function initSupportWidget() {
  const root = supportCreateWidget();

  supportBindWidget(root);
  supportUpdateCategoryFields(root);
  await supportSetupSupabase();
})();
