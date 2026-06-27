const adminSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  selectedTicketId: null,
  tickets: [],
  messagesByTicketId: {},
  notesByTicketId: {},
  user: null,
  profile: null
};

const adminAllowedRoles = ["support", "admin", "leitung", "manager"];
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

const statAll = document.getElementById("statAll");
const statOpen = document.getElementById("statOpen");
const statProgress = document.getElementById("statProgress");
const statClosed = document.getElementById("statClosed");
const latestTickets = document.getElementById("latestTickets");

const adminTicketsList = document.getElementById("adminTicketsList");
const ticketDetailCard = document.getElementById("ticketDetailCard");
const ticketSearchInput = document.getElementById("ticketSearchInput");
const ticketStatusFilter = document.getElementById("ticketStatusFilter");

function adminEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function adminFormatDate(value) {
  if (!value) return "Unbekannt";

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

function adminSetLoginMessage(text, type = "") {
  adminLoginMessage.textContent = text || "";
  adminLoginMessage.className = `admin-message ${type}`.trim();
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
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function adminLoadTickets() {
  const { data, error } = await adminSupabaseClient
    .from("tickets")
    .select("*")
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

function adminRenderDashboard() {
  const tickets = adminSettings.tickets;

  statAll.textContent = tickets.length;
  statOpen.textContent = tickets.filter((ticket) => ticket.status === "open").length;
  statProgress.textContent = tickets.filter((ticket) => ticket.status === "in_progress").length;
  statClosed.textContent = tickets.filter((ticket) => ticket.status === "closed").length;

  latestTickets.innerHTML = tickets.slice(0, 6).map((ticket) => `
    <button class="ticket-card" type="button" data-ticket-id="${adminEscape(ticket.id)}">
      <div class="ticket-card-row">
        <strong>${adminEscape(ticket.ticketNumber)}</strong>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
      </div>
      <small>${adminEscape(ticket.title)} · ${adminEscape(ticket.discordUsername)}</small>
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
      ticket.description,
      ticket.rank,
      ticket.applicationArea,
      ticket.targetUser
    ].join(" ").toLowerCase();

    const searchMatches = !search || searchable.includes(search);

    return statusMatches && searchMatches;
  });
}

function adminRenderTicketsList() {
  const tickets = adminGetFilteredTickets();

  adminTicketsList.innerHTML = tickets.map((ticket) => `
    <button class="ticket-card ${adminSettings.selectedTicketId === ticket.id ? "active" : ""}" type="button" data-ticket-id="${adminEscape(ticket.id)}">
      <div class="ticket-card-row">
        <strong>${adminEscape(ticket.ticketNumber)}</strong>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
      </div>
      <small>${adminEscape(ticket.title)}</small>
      <small>${adminEscape(ticket.discordUsername)} · ${adminEscape(adminFormatDate(ticket.createdAt))}</small>
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
    <div class="admin-message-bubble ${adminEscape(message.sender_type)}">
      <div class="admin-message-top">
        <span>${adminEscape(message.sender_name)}</span>
        <span>${adminEscape(adminFormatDate(message.created_at))}</span>
      </div>
      <p>${adminEscape(message.message_text)}</p>
    </div>
  `).join("");
}

function adminRenderNotes(ticketId) {
  const notes = adminSettings.notesByTicketId[ticketId] || [];

  if (!notes.length) {
    return `<div class="note-list">Keine internen Notizen vorhanden.</div>`;
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

function adminRenderTicketDetail(ticket) {
  ticketDetailCard.innerHTML = `
    <div class="detail-top">
      <div>
        <span class="status-badge ${adminEscape(ticket.status)}">${adminEscape(adminStatusLabel(ticket.status))}</span>
        <h2>${adminEscape(ticket.ticketNumber)} - ${adminEscape(ticket.title)}</h2>
        <p>${adminEscape(ticket.discordUsername)} · ${adminEscape(adminFormatDate(ticket.createdAt))}</p>
      </div>

      <select class="status-select" id="ticketStatusSelect">
        <option value="open" ${ticket.status === "open" ? "selected" : ""}>Offen</option>
        <option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>In Bearbeitung</option>
        <option value="closed" ${ticket.status === "closed" ? "selected" : ""}>Geschlossen</option>
      </select>
    </div>

    <div class="detail-grid">
      <div class="detail-box">
        <strong>Kategorie</strong>
        <span>${adminEscape(ticket.categoryLabel || ticket.category || "Nicht angegeben")}</span>
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
        <button class="small-button" id="adminRefreshMessagesButton" type="button">Nachrichten aktualisieren</button>
      </div>

      <div class="admin-messages" id="adminMessages">
        ${adminRenderMessages(ticket.id)}
      </div>

      <form class="chat-form" id="adminChatForm">
        <textarea id="adminChatInput" placeholder="Antwort an den User schreiben..." required></textarea>
        <button type="submit">Antwort senden</button>
      </form>
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

  statusSelect.addEventListener("change", async (event) => {
    await adminUpdateTicketStatus(ticket.id, event.target.value);
  });

  adminChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = document.getElementById("adminChatInput");
    const text = input.value.trim();

    if (!text) return;

    await adminSendSupportMessage(ticket.id, text);
    input.value = "";
  });

  adminNoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = document.getElementById("adminNoteInput");
    const text = input.value.trim();

    if (!text) return;

    await adminSaveNote(ticket.id, text);
    input.value = "";
  });

  adminRefreshMessagesButton.addEventListener("click", async () => {
    await adminLoadMessages(ticket.id);
    adminRenderTicketDetail(ticket);
  });
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

async function adminUpdateTicketStatus(ticketId, status) {
  const { error } = await adminSupabaseClient
    .from("tickets")
    .update({ status })
    .eq("id", ticketId);

  if (error) {
    alert(error.message || "Status konnte nicht geändert werden.");
    return;
  }

  const ticket = adminSettings.tickets.find((item) => item.id === ticketId);

  if (ticket) {
    ticket.status = status;
  }

  adminRenderDashboard();
  adminRenderTicketsList();
  await adminSelectTicket(ticketId);
}

async function adminSendSupportMessage(ticketId, text) {
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

  await adminLoadMessages(ticketId);

  const ticket = adminSettings.tickets.find((item) => item.id === ticketId);

  if (ticket) {
    adminRenderTicketDetail(ticket);
  }
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

reloadTicketsButton.addEventListener("click", async () => {
  await adminLoadTickets();
});

reloadTicketsButtonTwo.addEventListener("click", async () => {
  await adminLoadTickets();
});

ticketSearchInput.addEventListener("input", adminRenderTicketsList);
ticketStatusFilter.addEventListener("change", adminRenderTicketsList);

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
