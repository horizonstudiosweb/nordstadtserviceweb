const adminSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  selectedTicketId: null,
  pendingCloseTicketId: null,
  pendingBanIp: "",
  activeTicketCategory: "all",
  tickets: [],
  messagesByTicketId: {},
  notesByTicketId: {},
  attachmentsByTicketId: {},
  ipBans: [],
  user: null,
  profile: null
};

const adminAllowedRoles = ["support", "admin", "leitung", "manager"];
const adminReopenRoles = ["admin", "leitung", "manager"];
const adminManagerOnlyRoles = ["manager"];

let adminSupabaseClient = null;

const adminLoginScreen = document.getElementById("adminLoginScreen");
const adminApp = document.getElementById("adminApp");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminLoginMessage = document.getElementById("adminLoginMessage");

const adminUserEmail = document.getElementById("adminUserEmail");
const adminUserRole = document.getElementById("adminUserRole");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const adminConnectionStatus = document.getElementById("adminConnectionStatus");
const adminLastRefresh = document.getElementById("adminLastRefresh");
const systemSupabaseText = document.getElementById("systemSupabaseText");
const systemSessionText = document.getElementById("systemSessionText");

const adminNavButtons = document.querySelectorAll(".admin-nav-button");
const adminViews = document.querySelectorAll(".admin-view");

const reloadTicketsButton = document.getElementById("reloadTicketsButton");
const reloadTicketsButtonTwo = document.getElementById("reloadTicketsButtonTwo");
const reloadBansButton = document.getElementById("reloadBansButton");
const openTicketsViewButtons = document.querySelectorAll("[data-open-tickets-view]");
const dashboardCategoryButtons = document.querySelectorAll("[data-dashboard-category]");
const ticketCategoryButtons = document.querySelectorAll("[data-ticket-category]");

const statAll = document.getElementById("statAll");
const statOpen = document.getElementById("statOpen");
const statProgress = document.getElementById("statProgress");
const statClosed = document.getElementById("statClosed");

const statCategorySupport = document.getElementById("statCategorySupport");
const statCategoryApplication = document.getElementById("statCategoryApplication");
const statCategoryReport = document.getElementById("statCategoryReport");
const statCategoryBug = document.getElementById("statCategoryBug");

const latestTickets = document.getElementById("latestTickets");
const adminTicketsList = document.getElementById("adminTicketsList");
const ticketDetailCard = document.getElementById("ticketDetailCard");
const ticketSearchInput = document.getElementById("ticketSearchInput");
const ticketStatusFilter = document.getElementById("ticketStatusFilter");
const ticketListCount = document.getElementById("ticketListCount");

const closeTicketModal = document.getElementById("closeTicketModal");
const closeTicketForm = document.getElementById("closeTicketForm");
const closeReasonInput = document.getElementById("closeReasonInput");
const closeModalCancel = document.getElementById("closeModalCancel");
const closeModalCancelTop = document.getElementById("closeModalCancelTop");
const closeTicketMessage = document.getElementById("closeTicketMessage");

const banIpModal = document.getElementById("banIpModal");
const banIpForm = document.getElementById("banIpForm");
const banIpInput = document.getElementById("banIpInput");
const banIpReasonInput = document.getElementById("banIpReasonInput");
const banIpCancel = document.getElementById("banIpCancel");
const banIpCancelTop = document.getElementById("banIpCancelTop");
const banIpMessage = document.getElementById("banIpMessage");

const manualBanForm = document.getElementById("manualBanForm");
const manualBanIpInput = document.getElementById("manualBanIpInput");
const manualBanReasonInput = document.getElementById("manualBanReasonInput");
const manualBanMessage = document.getElementById("manualBanMessage");
const ipBansList = document.getElementById("ipBansList");

function adminEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function adminFormatDate(value) {
  if (!value) {
    return "Unbekannt";
  }

  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function adminFormatFileSize(size) {
  const number = Number(size || 0);

  if (!number) {
    return "Unbekannte Größe";
  }

  if (number < 1024) {
    return `${number} B`;
  }

  if (number < 1024 * 1024) {
    return `${(number / 1024).toFixed(1)} KB`;
  }

  return `${(number / 1024 / 1024).toFixed(1)} MB`;
}

function adminStatusLabel(status) {
  const labels = {
    open: "Offen",
    in_progress: "In Bearbeitung",
    closed: "Geschlossen"
  };

  return labels[status] || status || "Unbekannt";
}

function adminCategoryLabel(category, fallback) {
  const labels = {
    support: "Allgemein",
    application: "Bewerbung",
    report: "Report",
    bug: "Bug / Fehler"
  };

  return fallback || labels[category] || category || "Allgemein";
}

function adminSetLoginMessage(text, type = "") {
  adminLoginMessage.textContent = text || "";
  adminLoginMessage.className = `admin-message ${type}`.trim();
}

function adminSetCloseMessage(text, type = "") {
  closeTicketMessage.textContent = text || "";
  closeTicketMessage.className = `admin-message ${type}`.trim();
}

function adminSetBanMessage(text, type = "") {
  banIpMessage.textContent = text || "";
  banIpMessage.className = `admin-message ${type}`.trim();
}

function adminSetManualBanMessage(text, type = "") {
  manualBanMessage.textContent = text || "";
  manualBanMessage.className = `admin-message ${type}`.trim();
}

function adminSetConnectionStatus(status, text) {
  if (!adminConnectionStatus) return;

  adminConnectionStatus.textContent = text;
  adminConnectionStatus.className = status;

  if (systemSupabaseText) {
    systemSupabaseText.textContent = text;
  }

  if (adminLastRefresh) {
    adminLastRefresh.textContent = `Stand: ${adminFormatDate(new Date().toISOString())}`;
  }
}

function adminSetSessionStatus(text) {
  if (systemSessionText) {
    systemSessionText.textContent = text;
  }
}

function adminLoadScript(src) {
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

async function adminSetupSupabase() {
  await adminLoadScript("supabase-config.js");
  await adminLoadScript(adminSettings.supabaseJsUrl);

  const config = window.NordstadtSupabaseConfig?.getConfig?.();

  if (!config || !config.enabled || !config.url || !config.anonKey) {
    throw new Error("Supabase ist nicht aktiviert.");
  }

  adminSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
  adminSetConnectionStatus("online", "Supabase verbunden");
}

function adminShowApp() {
  adminLoginScreen.classList.add("hidden");
  adminApp.classList.remove("hidden");

  adminUserEmail.textContent = adminSettings.profile?.email || adminSettings.user?.email || "-";
  adminUserRole.textContent = adminSettings.profile?.role || "-";

  adminSetSessionStatus(`Angemeldet als ${adminSettings.profile?.role || "-"}`);
}

function adminShowLogin() {
  adminApp.classList.add("hidden");
  adminLoginScreen.classList.remove("hidden");
  adminSetSessionStatus("Nicht angemeldet");
}

async function adminLoadProfile() {
  const { data: sessionData, error: sessionError } = await adminSupabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    throw new Error("Keine aktive Sitzung.");
  }

  adminSettings.user = sessionData.session.user;

  const { data: profile, error } = await adminSupabaseClient
    .from("profiles")
    .select("id,email,role,created_at")
    .eq("id", adminSettings.user.id)
    .single();

  if (error || !profile) {
    throw new Error("Profil konnte nicht geladen werden. Prüfe die Rolle in Supabase.");
  }

  if (!adminAllowedRoles.includes(profile.role)) {
    throw new Error("Dieser Account hat keine Admin-Berechtigung.");
  }

  adminSettings.profile = profile;
}

function adminNormalizeTicket(row) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    category: row.category || "support",
    categoryLabel: row.category_label,
    discordUsername: row.discord_username,
    rank: row.rank,
    title: row.title,
    description: row.description,
    applicationArea: row.application_area,
    targetUser: row.target_user,
    proof: row.proof,
    reproduce: row.reproduce,
    status: row.status || "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    closedReason: row.closed_reason,
    closedByEmail: row.closed_by_email,
    closedAt: row.closed_at,
    requesterIp: row.requester_ip,
    requesterUserAgent: row.requester_user_agent,
    source: row.source,
    priority: row.priority,
    internalCategory: row.internal_category,
    cooldownIdentity: row.cooldown_identity,
    attachmentCount: row.attachment_count || 0
  };
}

async function adminLoadTickets() {
  adminSetConnectionStatus("online", "Tickets werden geladen...");

  const { data, error } = await adminSupabaseClient
    .from("tickets")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    adminSetConnectionStatus("offline", "Fehler beim Laden");
    throw new Error(error.message || "Tickets konnten nicht geladen werden.");
  }

  adminSettings.tickets = (data || []).map(adminNormalizeTicket);

  adminSetConnectionStatus("online", "Live-Verbindung aktiv");
  adminRenderDashboard();
  adminRenderTicketsList();

  const params = new URLSearchParams(window.location.search);
  const ticketParam = params.get("ticket");

  if (ticketParam) {
    const targetTicket = adminSettings.tickets.find((ticket) => {
      return ticket.ticketNumber === ticketParam || ticket.id === ticketParam;
    });

    if (targetTicket) {
      await adminSelectTicket(targetTicket.id);
      adminOpenView("tickets");
    }
  }
}

async function adminLoadMessages(ticketId) {
  const { data, error } = await adminSupabaseClient
    .from("ticket_messages")
    .select("id,ticket_id,sender_type,sender_name,message_text,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Nachrichten konnten nicht geladen werden.");
  }

  adminSettings.messagesByTicketId[ticketId] = data || [];
}

async function adminLoadNotes(ticketId) {
  const { data, error } = await adminSupabaseClient
    .from("ticket_notes")
    .select("id,ticket_id,admin_user_id,note_text,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) {
    adminSettings.notesByTicketId[ticketId] = [];
    return;
  }

  adminSettings.notesByTicketId[ticketId] = data || [];
}

async function adminLoadAttachments(ticketId) {
  const { data, error } = await adminSupabaseClient
    .from("ticket_attachments")
    .select("id,ticket_id,file_name,file_path,file_url,file_type,file_size,uploaded_by_type,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    adminSettings.attachmentsByTicketId[ticketId] = [];
    return;
  }

  adminSettings.attachmentsByTicketId[ticketId] = data || [];
}

async function adminLoadIpBans() {
  if (!adminIsManager()) {
    ipBansList.innerHTML = `<p class="muted">Nur Manager können IP-Sperren anzeigen.</p>`;
    return;
  }

  const { data, error } = await adminSupabaseClient
    .from("ip_bans")
    .select("id,ip_address,reason,banned_by_email,is_active,created_at,expires_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    ipBansList.innerHTML = `<p class="muted">IP-Sperren konnten nicht geladen werden.</p>`;
    return;
  }

  adminSettings.ipBans = data || [];
  adminRenderIpBans();
}

function adminIsManager() {
  return adminManagerOnlyRoles.includes(adminSettings.profile?.role);
}

function adminCanReopenTickets() {
  return adminReopenRoles.includes(adminSettings.profile?.role);
}

function adminRenderDashboard() {
  const tickets = adminSettings.tickets;

  statAll.textContent = tickets.length;
  statOpen.textContent = tickets.filter((ticket) => ticket.status === "open").length;
  statProgress.textContent = tickets.filter((ticket) => ticket.status === "in_progress").length;
  statClosed.textContent = tickets.filter((ticket) => ticket.status === "closed").length;

  statCategorySupport.textContent = tickets.filter((ticket) => ticket.category === "support").length;
  statCategoryApplication.textContent = tickets.filter((ticket) => ticket.category === "application").length;
  statCategoryReport.textContent = tickets.filter((ticket) => ticket.category === "report").length;
  statCategoryBug.textContent = tickets.filter((ticket) => ticket.category === "bug").length;

  latestTickets.innerHTML = tickets.slice(0, 7).map((ticket) => `
    <button class="ticket-card" type="button" data-ticket-id="${adminEscape(ticket.id)}">
      <div class="ticket-card-row">
        <strong>${adminEscape(ticket.ticketNumber)}</strong>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
      </div>

      <span class="ticket-category-pill ${adminEscape(ticket.category)}">
        ${adminEscape(adminCategoryLabel(ticket.category, ticket.categoryLabel))}
      </span>

      <small>${adminEscape(ticket.title || "Ohne Titel")}</small>
      <small>${adminEscape(ticket.discordUsername || "Unbekannt")} · ${adminEscape(adminFormatDate(ticket.lastMessageAt || ticket.createdAt))}</small>
    </button>
  `).join("") || `<p class="muted">Noch keine Tickets vorhanden.</p>`;

  latestTickets.querySelectorAll("[data-ticket-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await adminSelectTicket(button.dataset.ticketId);
      adminOpenView("tickets");
    });
  });
}

function adminGetFilteredTickets() {
  const search = ticketSearchInput.value.trim().toLowerCase();
  const status = ticketStatusFilter.value;
  const category = adminSettings.activeTicketCategory;

  return adminSettings.tickets.filter((ticket) => {
    const statusMatches = status === "all" || ticket.status === status;
    const categoryMatches = category === "all" || ticket.category === category;

    const searchable = [
      ticket.ticketNumber,
      ticket.title,
      ticket.discordUsername,
      ticket.categoryLabel,
      ticket.category,
      ticket.description,
      ticket.rank,
      ticket.applicationArea,
      ticket.targetUser,
      ticket.proof,
      ticket.reproduce,
      ticket.closedReason,
      ticket.closedByEmail,
      ticket.requesterIp,
      ticket.requesterUserAgent,
      ticket.source,
      ticket.priority
    ].join(" ").toLowerCase();

    const searchMatches = !search || searchable.includes(search);

    return statusMatches && categoryMatches && searchMatches;
  });
}

function adminRenderTicketsList() {
  const tickets = adminGetFilteredTickets();

  if (ticketListCount) {
    ticketListCount.textContent = tickets.length;
  }

  ticketCategoryButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.ticketCategory === adminSettings.activeTicketCategory);
  });

  adminTicketsList.innerHTML = tickets.map((ticket) => `
    <button class="ticket-card ${adminSettings.selectedTicketId === ticket.id ? "active" : ""}" type="button" data-ticket-id="${adminEscape(ticket.id)}">
      <div class="ticket-card-row">
        <strong>${adminEscape(ticket.ticketNumber)}</strong>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
      </div>

      <span class="ticket-category-pill ${adminEscape(ticket.category)}">
        ${adminEscape(adminCategoryLabel(ticket.category, ticket.categoryLabel))}
      </span>

      <small>${adminEscape(ticket.title || "Ohne Titel")}</small>
      <small>${adminEscape(ticket.discordUsername || "Unbekannt")} · ${adminEscape(adminFormatDate(ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt))}</small>
    </button>
  `).join("") || `<div class="empty-detail">Keine Tickets gefunden.</div>`;

  adminTicketsList.querySelectorAll("[data-ticket-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await adminSelectTicket(button.dataset.ticketId);
    });
  });
}

function adminRenderMessages(ticketId) {
  const messages = adminSettings.messagesByTicketId[ticketId] || [];

  if (!messages.length) {
    return `
      <div class="admin-message-bubble system">
        <div class="admin-message-top">
          <span>System</span>
          <span>Jetzt</span>
        </div>
        <p>Noch keine Nachrichten vorhanden.</p>
      </div>
    `;
  }

  return messages.map((message) => {
    const senderType = message.sender_type || "system";
    const senderName = senderType === "support" ? "Support Agent" : message.sender_name || "Unbekannt";

    return `
      <div class="admin-message-bubble ${adminEscape(senderType)}">
        <div class="admin-message-top">
          <span>${adminEscape(senderName)}</span>
          <span>${adminEscape(adminFormatDate(message.created_at))}</span>
        </div>
        <p>${adminEscape(message.message_text)}</p>
      </div>
    `;
  }).join("");
}

function adminRenderNotes(ticketId) {
  const notes = adminSettings.notesByTicketId[ticketId] || [];

  if (!notes.length) {
    return `<div class="note-list"><p class="muted">Keine internen Notizen vorhanden.</p></div>`;
  }

  return `
    <div class="note-list">
      ${notes.map((note) => `
        <div class="detail-box full">
          <strong>${adminEscape(adminFormatDate(note.created_at))}</strong>
          <span>${adminEscape(note.note_text)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function adminRenderAttachments(ticketId) {
  const attachments = adminSettings.attachmentsByTicketId[ticketId] || [];

  if (!attachments.length) {
    return `<p class="muted">Keine Anhänge vorhanden.</p>`;
  }

  return `
    <div class="attachments-list">
      ${attachments.map((attachment) => `
        <div class="attachment-item">
          <div class="attachment-info">
            <strong>${adminEscape(attachment.file_name || "Datei")}</strong>
            <small>${adminEscape(attachment.file_type || "Unbekannter Typ")} · ${adminEscape(adminFormatFileSize(attachment.file_size))}</small>
          </div>

          <a href="${adminEscape(attachment.file_url || "#")}" target="_blank" rel="noopener noreferrer">
            Öffnen
          </a>
        </div>
      `).join("")}
    </div>
  `;
}

function adminRenderClosedReason(ticket) {
  if (ticket.status !== "closed") {
    return "";
  }

  return `
    <div class="detail-box full closed-reason-box">
      <strong>Schließgrund</strong>
      <span>${adminEscape(ticket.closedReason || "Kein Grund angegeben.")}</span>
    </div>

    <div class="detail-box">
      <strong>Geschlossen von</strong>
      <span>${adminEscape(ticket.closedByEmail || "Unbekannt")}</span>
    </div>

    <div class="detail-box">
      <strong>Geschlossen am</strong>
      <span>${adminEscape(adminFormatDate(ticket.closedAt))}</span>
    </div>
  `;
}

function adminRenderIpSecurity(ticket) {
  const canBan = adminIsManager();
  const hasIp = ticket.requesterIp && ticket.requesterIp !== "unknown";

  return `
    <div class="detail-box security-warning-box">
      <strong>Requester IP</strong>
      <span>${adminEscape(ticket.requesterIp || "Nicht gespeichert")}</span>
    </div>

    <div class="detail-box">
      <strong>User Agent</strong>
      <span>${adminEscape(ticket.requesterUserAgent || "Nicht gespeichert")}</span>
    </div>

    <div class="detail-box">
      <strong>Quelle</strong>
      <span>${adminEscape(ticket.source || "Unbekannt")}</span>
    </div>

    <div class="detail-box">
      <strong>Priorität</strong>
      <span>${adminEscape(ticket.priority || "normal")}</span>
    </div>

    ${hasIp && canBan ? `
      <div class="detail-box full security-warning-box">
        <strong>Manager-Aktion</strong>
        <span>Diese Ticket-IP kann gesperrt werden, wenn Spam oder Trolling vorliegt.</span>
        <button class="danger-action" id="openBanIpModalButton" type="button">IP sperren</button>
      </div>
    ` : ""}

    ${hasIp && !canBan ? `
      <div class="detail-box full">
        <strong>IP-Sperre</strong>
        <span>Nur Manager können IP-Adressen sperren.</span>
      </div>
    ` : ""}
  `;
}

function adminRenderTicketDetail(ticket) {
  const isClosed = ticket.status === "closed";
  const canReopen = adminCanReopenTickets();

  ticketDetailCard.innerHTML = `
    <div class="detail-top">
      <div>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
        <h2>${adminEscape(ticket.ticketNumber)} - ${adminEscape(ticket.title || "Ohne Titel")}</h2>
        <p>
          ${adminEscape(ticket.discordUsername || "Unbekannt")}
          · ${adminEscape(adminCategoryLabel(ticket.category, ticket.categoryLabel))}
          · Erstellt ${adminEscape(adminFormatDate(ticket.createdAt))}
          · Letzte Aktivität ${adminEscape(adminFormatDate(ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt))}
        </p>
      </div>

      <div class="detail-actions">
        <select class="status-select" id="ticketStatusSelect" ${isClosed ? "disabled" : ""}>
          <option value="open" ${ticket.status === "open" ? "selected" : ""}>Offen</option>
          <option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>In Bearbeitung</option>
          <option value="closed" ${ticket.status === "closed" ? "selected" : ""}>Geschlossen</option>
        </select>

        ${!isClosed ? `
          <button class="danger-action" id="openCloseTicketModalButton" type="button">
            Mit Grund schließen
          </button>
        ` : ""}

        ${isClosed && canReopen ? `
          <button class="small-button" id="reopenTicketButton" type="button">
            Wieder öffnen
          </button>
        ` : ""}
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-box">
        <strong>Kategorie</strong>
        <span>${adminEscape(adminCategoryLabel(ticket.category, ticket.categoryLabel))}</span>
      </div>

      <div class="detail-box">
        <strong>Discord</strong>
        <span>${adminEscape(ticket.discordUsername || "Nicht angegeben")}</span>
      </div>

      <div class="detail-box">
        <strong>Rang / Rolle</strong>
        <span>${adminEscape(ticket.rank || "Nicht angegeben")}</span>
      </div>

      <div class="detail-box">
        <strong>Status</strong>
        <span>${adminEscape(adminStatusLabel(ticket.status))}</span>
      </div>

      ${adminRenderClosedReason(ticket)}

      <div class="detail-box full">
        <strong>Beschreibung</strong>
        <span>${adminEscape(ticket.description || "Keine Beschreibung")}</span>
      </div>

      <div class="detail-box">
        <strong>Bewerbungsbereich</strong>
        <span>${adminEscape(ticket.applicationArea || "Nicht angegeben")}</span>
      </div>

      <div class="detail-box">
        <strong>Gemeldeter User</strong>
        <span>${adminEscape(ticket.targetUser || "Nicht angegeben")}</span>
      </div>

      <div class="detail-box full">
        <strong>Beweise</strong>
        <span>${adminEscape(ticket.proof || "Nicht angegeben")}</span>
      </div>

      <div class="detail-box full">
        <strong>Reproduktion / Schritte</strong>
        <span>${adminEscape(ticket.reproduce || "Nicht angegeben")}</span>
      </div>

      ${adminRenderIpSecurity(ticket)}
    </div>

    <div class="attachments-box">
      <div class="section-title-row">
        <h3>Anhänge</h3>
        <button class="small-button ghost" id="adminRefreshAttachmentsButton" type="button">Anhänge aktualisieren</button>
      </div>

      ${adminRenderAttachments(ticket.id)}
    </div>

    <div class="admin-chat">
      <div class="section-title-row">
        <h3>Ticket-Chat mit User</h3>
        <button class="small-button ghost" id="adminRefreshMessagesButton" type="button">Nachrichten aktualisieren</button>
      </div>

      <div class="admin-messages" id="adminMessages">
        ${adminRenderMessages(ticket.id)}
      </div>

      ${!isClosed ? `
        <form class="chat-form" id="adminChatForm">
          <textarea id="adminChatInput" placeholder="Antwort an den User schreiben..." required></textarea>
          <button type="submit">Antwort senden</button>
        </form>
      ` : `
        <p class="muted">Dieses Ticket ist geschlossen. Antworten sind gesperrt.</p>
      `}
    </div>

    <div class="note-box">
      <h3>Interne Notizen</h3>
      ${adminRenderNotes(ticket.id)}

      <form class="note-form" id="adminNoteForm">
        <textarea id="adminNoteInput" placeholder="Interne Notiz schreiben..."></textarea>
        <button type="submit">Notiz speichern</button>
      </form>
    </div>
  `;

  const statusSelect = document.getElementById("ticketStatusSelect");
  const adminChatForm = document.getElementById("adminChatForm");
  const adminNoteForm = document.getElementById("adminNoteForm");
  const adminRefreshMessagesButton = document.getElementById("adminRefreshMessagesButton");
  const adminRefreshAttachmentsButton = document.getElementById("adminRefreshAttachmentsButton");
  const openCloseTicketModalButton = document.getElementById("openCloseTicketModalButton");
  const reopenTicketButton = document.getElementById("reopenTicketButton");
  const openBanIpModalButton = document.getElementById("openBanIpModalButton");

  if (statusSelect) {
    statusSelect.addEventListener("change", async (event) => {
      if (event.target.value === "closed") {
        event.target.value = ticket.status;
        adminOpenCloseModal(ticket.id);
        return;
      }

      await adminUpdateTicketStatus(ticket.id, event.target.value);
    });
  }

  if (adminChatForm) {
    adminChatForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = document.getElementById("adminChatInput");
      const text = input.value.trim();

      if (!text) return;

      await adminSendSupportMessage(ticket.id, text);
      input.value = "";
    });
  }

  if (adminNoteForm) {
    adminNoteForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = document.getElementById("adminNoteInput");
      const text = input.value.trim();

      if (!text) return;

      await adminSaveNote(ticket.id, text);
      input.value = "";
    });
  }

  if (adminRefreshMessagesButton) {
    adminRefreshMessagesButton.addEventListener("click", async () => {
      await adminRefreshSelectedTicket();
    });
  }

  if (adminRefreshAttachmentsButton) {
    adminRefreshAttachmentsButton.addEventListener("click", async () => {
      await adminLoadAttachments(ticket.id);
      adminRenderTicketDetail(ticket);
    });
  }

  if (openCloseTicketModalButton) {
    openCloseTicketModalButton.addEventListener("click", () => {
      adminOpenCloseModal(ticket.id);
    });
  }

  if (reopenTicketButton) {
    reopenTicketButton.addEventListener("click", async () => {
      await adminReopenTicket(ticket.id);
    });
  }

  if (openBanIpModalButton) {
    openBanIpModalButton.addEventListener("click", () => {
      adminOpenBanIpModal(ticket.requesterIp);
    });
  }

  const messagesContainer = document.getElementById("adminMessages");

  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function adminRenderIpBans() {
  if (!adminSettings.ipBans.length) {
    ipBansList.innerHTML = `<p class="muted">Keine aktiven IP-Sperren vorhanden.</p>`;
    return;
  }

  ipBansList.innerHTML = adminSettings.ipBans.map((ban) => `
    <div class="ip-ban-card">
      <div class="ip-ban-top">
        <strong>${adminEscape(ban.ip_address)}</strong>
        <span class="status-badge closed">Gesperrt</span>
      </div>

      <p>${adminEscape(ban.reason || "Kein Grund angegeben.")}</p>

      <small>
        Von ${adminEscape(ban.banned_by_email || "Unbekannt")}
        · ${adminEscape(adminFormatDate(ban.created_at))}
      </small>

      <div class="ip-ban-actions">
        <button class="small-button ghost" type="button" data-unban-ip="${adminEscape(ban.ip_address)}">
          Entsperren
        </button>
      </div>
    </div>
  `).join("");

  ipBansList.querySelectorAll("[data-unban-ip]").forEach((button) => {
    button.addEventListener("click", async () => {
      await adminUnbanIp(button.dataset.unbanIp);
    });
  });
}

async function adminSelectTicket(ticketId) {
  adminSettings.selectedTicketId = ticketId;

  await adminLoadMessages(ticketId);
  await adminLoadNotes(ticketId);
  await adminLoadAttachments(ticketId);

  const ticket = adminSettings.tickets.find((item) => item.id === ticketId);

  if (!ticket) return;

  adminRenderTicketsList();
  adminRenderTicketDetail(ticket);
}

async function adminRefreshSelectedTicket() {
  if (!adminSettings.selectedTicketId) {
    return;
  }

  await adminLoadTickets();
  await adminSelectTicket(adminSettings.selectedTicketId);
}

async function adminUpdateTicketStatus(ticketId, status) {
  const { error } = await adminSupabaseClient
    .from("tickets")
    .update({ status })
    .eq("id", ticketId);

  if (error) {
    alert(error.message || "Status konnte nicht geändert werden.");
    return;
  }

  await adminLoadTickets();
  await adminSelectTicket(ticketId);
}

async function adminSendSupportMessage(ticketId, text) {
  const ticket = adminSettings.tickets.find((item) => item.id === ticketId);

  if (ticket?.status === "closed") {
    alert("Dieses Ticket ist geschlossen. Antworten sind gesperrt.");
    return;
  }

  const { error } = await adminSupabaseClient
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_type: "support",
      sender_name: "Support Agent",
      message_text: text
    });

  if (error) {
    alert(error.message || "Antwort konnte nicht gesendet werden.");
    return;
  }

  await adminRefreshSelectedTicket();
}

async function adminSaveNote(ticketId, text) {
  const { error } = await adminSupabaseClient
    .from("ticket_notes")
    .insert({
      ticket_id: ticketId,
      admin_user_id: adminSettings.user.id,
      note_text: text
    });

  if (error) {
    alert(error.message || "Notiz konnte nicht gespeichert werden.");
    return;
  }

  await adminLoadNotes(ticketId);

  const ticket = adminSettings.tickets.find((item) => item.id === ticketId);

  if (ticket) {
    adminRenderTicketDetail(ticket);
  }
}

function adminOpenCloseModal(ticketId) {
  adminSettings.pendingCloseTicketId = ticketId;
  closeReasonInput.value = "";
  adminSetCloseMessage("");
  closeTicketModal.classList.remove("hidden");

  setTimeout(() => {
    closeReasonInput.focus();
  }, 80);
}

function adminCloseCloseModal() {
  adminSettings.pendingCloseTicketId = null;
  closeReasonInput.value = "";
  adminSetCloseMessage("");
  closeTicketModal.classList.add("hidden");
}

async function adminCloseTicketWithReason(ticketId, reason) {
  const { data, error } = await adminSupabaseClient.rpc("close_ticket_with_reason", {
    p_ticket_id: ticketId,
    p_reason: reason
  });

  if (error) {
    throw new Error(error.message || "Ticket konnte nicht geschlossen werden.");
  }

  if (!data || data.success !== true) {
    throw new Error(data?.error || "Ticket konnte nicht geschlossen werden.");
  }
}

async function adminReopenTicket(ticketId) {
  const { data, error } = await adminSupabaseClient.rpc("reopen_ticket", {
    p_ticket_id: ticketId
  });

  if (error) {
    alert(error.message || "Ticket konnte nicht geöffnet werden.");
    return;
  }

  if (!data || data.success !== true) {
    alert(data?.error || "Ticket konnte nicht geöffnet werden.");
    return;
  }

  await adminLoadTickets();
  await adminSelectTicket(ticketId);
}

function adminOpenBanIpModal(ipAddress) {
  if (!adminIsManager()) {
    alert("Nur Manager können IP-Adressen sperren.");
    return;
  }

  adminSettings.pendingBanIp = ipAddress || "";
  banIpInput.value = ipAddress || "";
  banIpReasonInput.value = "";
  adminSetBanMessage("");
  banIpModal.classList.remove("hidden");

  setTimeout(() => {
    banIpReasonInput.focus();
  }, 80);
}

function adminCloseBanIpModal() {
  adminSettings.pendingBanIp = "";
  banIpInput.value = "";
  banIpReasonInput.value = "";
  adminSetBanMessage("");
  banIpModal.classList.add("hidden");
}

async function adminBanIp(ipAddress, reason) {
  const { data, error } = await adminSupabaseClient.rpc("ban_ip_address", {
    p_ip_address: ipAddress,
    p_reason: reason,
    p_expires_at: null
  });

  if (error) {
    throw new Error(error.message || "IP konnte nicht gesperrt werden.");
  }

  if (!data || data.success !== true) {
    throw new Error(data?.error || "IP konnte nicht gesperrt werden.");
  }
}

async function adminUnbanIp(ipAddress) {
  if (!adminIsManager()) {
    alert("Nur Manager können IP-Adressen entsperren.");
    return;
  }

  const { data, error } = await adminSupabaseClient.rpc("unban_ip_address", {
    p_ip_address: ipAddress
  });

  if (error) {
    alert(error.message || "IP konnte nicht entsperrt werden.");
    return;
  }

  if (!data || data.success !== true) {
    alert(data?.error || "IP konnte nicht entsperrt werden.");
    return;
  }

  await adminLoadIpBans();
}

function adminOpenView(viewName) {
  adminViews.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  adminNavButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminView === viewName);
  });

  if (viewName === "security") {
    adminLoadIpBans();
  }
}

function adminSetTicketCategory(category) {
  adminSettings.activeTicketCategory = category;
  adminRenderTicketsList();
}

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    adminSetLoginMessage("Login läuft...");

    const { error } = await adminSupabaseClient.auth.signInWithPassword({
      email: adminEmail.value.trim(),
      password: adminPassword.value
    });

    if (error) {
      throw new Error(error.message || "Login fehlgeschlagen.");
    }

    await adminLoadProfile();
    adminShowApp();
    await adminLoadTickets();

    adminSetLoginMessage("");
  } catch (error) {
    adminSetLoginMessage(error.message, "error");
  }
});

adminLogoutButton.addEventListener("click", async () => {
  await adminSupabaseClient.auth.signOut();

  adminSettings.selectedTicketId = null;
  adminSettings.pendingCloseTicketId = null;
  adminSettings.pendingBanIp = "";
  adminSettings.activeTicketCategory = "all";
  adminSettings.tickets = [];
  adminSettings.messagesByTicketId = {};
  adminSettings.notesByTicketId = {};
  adminSettings.attachmentsByTicketId = {};
  adminSettings.ipBans = [];
  adminSettings.user = null;
  adminSettings.profile = null;

  adminShowLogin();
});

adminNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    adminOpenView(button.dataset.adminView);
  });
});

openTicketsViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    adminOpenView("tickets");
  });
});

dashboardCategoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    adminSetTicketCategory(button.dataset.dashboardCategory);
    adminOpenView("tickets");
  });
});

ticketCategoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    adminSetTicketCategory(button.dataset.ticketCategory);
  });
});

reloadTicketsButton.addEventListener("click", async () => {
  await adminLoadTickets();

  if (adminSettings.selectedTicketId) {
    await adminSelectTicket(adminSettings.selectedTicketId);
  }
});

reloadTicketsButtonTwo.addEventListener("click", async () => {
  await adminLoadTickets();

  if (adminSettings.selectedTicketId) {
    await adminSelectTicket(adminSettings.selectedTicketId);
  }
});

reloadBansButton.addEventListener("click", async () => {
  await adminLoadIpBans();
});

ticketSearchInput.addEventListener("input", adminRenderTicketsList);
ticketStatusFilter.addEventListener("change", adminRenderTicketsList);

closeModalCancel.addEventListener("click", adminCloseCloseModal);
closeModalCancelTop.addEventListener("click", adminCloseCloseModal);

closeTicketModal.addEventListener("click", (event) => {
  if (event.target === closeTicketModal) {
    adminCloseCloseModal();
  }
});

closeTicketForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const ticketId = adminSettings.pendingCloseTicketId;
  const reason = closeReasonInput.value.trim();

  if (!ticketId) {
    adminSetCloseMessage("Kein Ticket ausgewählt.", "error");
    return;
  }

  if (reason.length < 5) {
    adminSetCloseMessage("Bitte gib einen richtigen Schließgrund an.", "error");
    return;
  }

  try {
    adminSetCloseMessage("Ticket wird geschlossen...");

    await adminCloseTicketWithReason(ticketId, reason);

    adminSetCloseMessage("Ticket wurde geschlossen.", "success");

    await adminLoadTickets();
    await adminSelectTicket(ticketId);

    setTimeout(() => {
      adminCloseCloseModal();
    }, 450);
  } catch (error) {
    adminSetCloseMessage(error.message, "error");
  }
});

banIpCancel.addEventListener("click", adminCloseBanIpModal);
banIpCancelTop.addEventListener("click", adminCloseBanIpModal);

banIpModal.addEventListener("click", (event) => {
  if (event.target === banIpModal) {
    adminCloseBanIpModal();
  }
});

banIpForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const ipAddress = banIpInput.value.trim();
  const reason = banIpReasonInput.value.trim();

  if (!ipAddress) {
    adminSetBanMessage("Keine IP-Adresse ausgewählt.", "error");
    return;
  }

  if (reason.length < 5) {
    adminSetBanMessage("Bitte gib einen richtigen Sperrgrund an.", "error");
    return;
  }

  try {
    adminSetBanMessage("IP wird gesperrt...");

    await adminBanIp(ipAddress, reason);

    adminSetBanMessage("IP wurde gesperrt.", "success");
    await adminLoadIpBans();

    setTimeout(() => {
      adminCloseBanIpModal();
    }, 450);
  } catch (error) {
    adminSetBanMessage(error.message, "error");
  }
});

manualBanForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const ipAddress = manualBanIpInput.value.trim();
  const reason = manualBanReasonInput.value.trim();

  if (!adminIsManager()) {
    adminSetManualBanMessage("Nur Manager können IP-Adressen sperren.", "error");
    return;
  }

  if (!ipAddress) {
    adminSetManualBanMessage("Bitte gib eine IP-Adresse ein.", "error");
    return;
  }

  if (reason.length < 5) {
    adminSetManualBanMessage("Bitte gib einen richtigen Sperrgrund an.", "error");
    return;
  }

  try {
    adminSetManualBanMessage("IP wird gesperrt...");

    await adminBanIp(ipAddress, reason);

    manualBanIpInput.value = "";
    manualBanReasonInput.value = "";

    adminSetManualBanMessage("IP wurde gesperrt.", "success");
    await adminLoadIpBans();
  } catch (error) {
    adminSetManualBanMessage(error.message, "error");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !closeTicketModal.classList.contains("hidden")) {
    adminCloseCloseModal();
  }

  if (event.key === "Escape" && !banIpModal.classList.contains("hidden")) {
    adminCloseBanIpModal();
  }
});

(async function initAdmin() {
  try {
    await adminSetupSupabase();

    const { data } = await adminSupabaseClient.auth.getSession();

    if (data.session) {
      try {
        await adminLoadProfile();
        adminShowApp();
        await adminLoadTickets();
      } catch (error) {
        adminShowLogin();
        adminSetLoginMessage(error.message, "error");
      }
    } else {
      adminShowLogin();
    }
  } catch (error) {
    adminSetConnectionStatus("offline", "Nicht verbunden");
    adminShowLogin();
    adminSetLoginMessage(error.message, "error");
  }
})();
