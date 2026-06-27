const adminSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  selectedTicketId: null,
  pendingCloseTicketId: null,
  tickets: [],
  messagesByTicketId: {},
  notesByTicketId: {},
  user: null,
  profile: null
};

const adminAllowedRoles = ["support", "admin", "leitung", "manager"];
const adminReopenRoles = ["admin", "leitung", "manager"];

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

const adminNavButtons = document.querySelectorAll(".admin-nav-button");
const adminViews = document.querySelectorAll(".admin-view");

const reloadTicketsButton = document.getElementById("reloadTicketsButton");
const reloadTicketsButtonTwo = document.getElementById("reloadTicketsButtonTwo");
const openTicketsViewButtons = document.querySelectorAll("[data-open-tickets-view]");

const statAll = document.getElementById("statAll");
const statOpen = document.getElementById("statOpen");
const statProgress = document.getElementById("statProgress");
const statClosed = document.getElementById("statClosed");
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
    support: "Allgemeiner Support",
    application: "Bewerbung",
    report: "Spieler melden",
    bug: "Bug melden"
  };

  return fallback || labels[category] || category || "Support";
}

function adminSetLoginMessage(text, type = "") {
  adminLoginMessage.textContent = text || "";
  adminLoginMessage.className = `admin-message ${type}`.trim();
}

function adminSetCloseMessage(text, type = "") {
  closeTicketMessage.textContent = text || "";
  closeTicketMessage.className = `admin-message ${type}`.trim();
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
}

function adminShowApp() {
  adminLoginScreen.classList.add("hidden");
  adminApp.classList.remove("hidden");

  adminUserEmail.textContent = adminSettings.profile?.email || adminSettings.user?.email || "-";
  adminUserRole.textContent = adminSettings.profile?.role || "-";
}

function adminShowLogin() {
  adminApp.classList.add("hidden");
  adminLoginScreen.classList.remove("hidden");
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
    category: row.category,
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
    closedAt: row.closed_at
  };
}

async function adminLoadTickets() {
  const { data, error } = await adminSupabaseClient
    .from("tickets")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Tickets konnten nicht geladen werden.");
  }

  adminSettings.tickets = (data || []).map(adminNormalizeTicket);

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

function adminGetTicketPreview(ticket) {
  if (ticket.closedReason && ticket.status === "closed") {
    return `Geschlossen: ${ticket.closedReason}`;
  }

  if (ticket.description) {
    return ticket.description;
  }

  return "Keine Beschreibung vorhanden.";
}

function adminRenderDashboard() {
  const tickets = adminSettings.tickets;

  statAll.textContent = tickets.length;
  statOpen.textContent = tickets.filter((ticket) => ticket.status === "open").length;
  statProgress.textContent = tickets.filter((ticket) => ticket.status === "in_progress").length;
  statClosed.textContent = tickets.filter((ticket) => ticket.status === "closed").length;

  latestTickets.innerHTML = tickets.slice(0, 7).map((ticket) => `
    <button class="ticket-card" type="button" data-ticket-id="${adminEscape(ticket.id)}">
      <div class="ticket-card-row">
        <strong>${adminEscape(ticket.ticketNumber)}</strong>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
      </div>
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

  return adminSettings.tickets.filter((ticket) => {
    const statusMatches = status === "all" || ticket.status === status;

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
      ticket.closedByEmail
    ].join(" ").toLowerCase();

    const searchMatches = !search || searchable.includes(search);

    return statusMatches && searchMatches;
  });
}

function adminRenderTicketsList() {
  const tickets = adminGetFilteredTickets();

  if (ticketListCount) {
    ticketListCount.textContent = tickets.length;
  }

  adminTicketsList.innerHTML = tickets.map((ticket) => `
    <button class="ticket-card ${adminSettings.selectedTicketId === ticket.id ? "active" : ""}" type="button" data-ticket-id="${adminEscape(ticket.id)}">
      <div class="ticket-card-row">
        <strong>${adminEscape(ticket.ticketNumber)}</strong>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
      </div>
      <small>${adminEscape(ticket.title || "Ohne Titel")}</small>
      <small>${adminEscape(ticket.discordUsername || "Unbekannt")} · ${adminEscape(adminCategoryLabel(ticket.category, ticket.categoryLabel))}</small>
      <small>${adminEscape(adminFormatDate(ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt))}</small>
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

  return messages.map((message) => `
    <div class="admin-message-bubble ${adminEscape(message.sender_type || "system")}">
      <div class="admin-message-top">
        <span>${adminEscape(message.sender_name || "Unbekannt")}</span>
        <span>${adminEscape(adminFormatDate(message.created_at))}</span>
      </div>
      <p>${adminEscape(message.message_text)}</p>
    </div>
  `).join("");
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

function adminCanReopenTickets() {
  return adminReopenRoles.includes(adminSettings.profile?.role);
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
  const openCloseTicketModalButton = document.getElementById("openCloseTicketModalButton");
  const reopenTicketButton = document.getElementById("reopenTicketButton");

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

  const messagesContainer = document.getElementById("adminMessages");

  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

async function adminSelectTicket(ticketId) {
  adminSettings.selectedTicketId = ticketId;

  await adminLoadMessages(ticketId);
  await adminLoadNotes(ticketId);

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

  const senderName = `${adminSettings.profile.role} · ${adminSettings.profile.email}`;

  const { error } = await adminSupabaseClient
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_type: "support",
      sender_name: senderName,
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

function adminOpenView(viewName) {
  adminViews.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  adminNavButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminView === viewName);
  });
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
  adminSettings.tickets = [];
  adminSettings.messagesByTicketId = {};
  adminSettings.notesByTicketId = {};
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !closeTicketModal.classList.contains("hidden")) {
    adminCloseCloseModal();
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
    adminShowLogin();
    adminSetLoginMessage(error.message, "error");
  }
})();
