const adminSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  selectedTicketId: null,
  tickets: [],
  notesByTicketId: {},
  user: null,
  profile: null
};

const adminStatusLabels = {
  open: "Offen",
  progress: "In Bearbeitung",
  waiting: "Wartet auf User",
  closed: "Geschlossen"
};

const adminCategoryLabels = {
  general: "Allgemeiner Support",
  application: "Bewerbung",
  report: "Report",
  bug: "Bug melden"
};

const adminAllowedRoles = ["support", "admin", "leitung", "manager"];

let adminSupabaseClient = null;

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
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

async function adminSetupSupabase() {
  await adminLoadScript("supabase-config.js");
  await adminLoadScript(adminSettings.supabaseJsUrl);

  if (!window.NordstadtSupabaseConfig || !window.NordstadtSupabaseConfig.getConfig) {
    throw new Error("supabase-config.js wurde nicht gefunden.");
  }

  const config = window.NordstadtSupabaseConfig.getConfig();

  if (!config.enabled || !config.url || !config.anonKey) {
    throw new Error("Supabase ist in supabase-config.js nicht aktiviert.");
  }

  adminSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
}

function adminShowLoginMessage(message) {
  const box = document.getElementById("adminLoginMessage");

  if (!box) return;

  box.textContent = message;
  box.classList.add("show");
}

function adminHideLoginMessage() {
  const box = document.getElementById("adminLoginMessage");

  if (!box) return;

  box.textContent = "";
  box.classList.remove("show");
}

function adminShowLogin() {
  const login = document.getElementById("adminLoginScreen");
  const app = document.getElementById("adminApp");

  if (login) login.classList.remove("hidden");
  if (app) app.classList.add("hidden");
}

function adminShowApp() {
  const login = document.getElementById("adminLoginScreen");
  const app = document.getElementById("adminApp");

  if (login) login.classList.add("hidden");
  if (app) app.classList.remove("hidden");
}

function adminEscape(value) {
  if (value === null || value === undefined || value === "") {
    return "Nicht angegeben";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function adminFormatDate(dateString) {
  if (!dateString) return "Unbekannt";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Unbekannt";

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function adminGetCategoryLabel(ticket) {
  return ticket.category_label || adminCategoryLabels[ticket.category] || "Support";
}

function adminGetStatusLabel(status) {
  return adminStatusLabels[status] || "Offen";
}

function adminCreateEmptyMessage(text) {
  return `<div class="admin-empty">${text}</div>`;
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
    updatedAt: row.updated_at,
    raw: row
  };
}

function adminSwitchView(viewName) {
  const navButtons = document.querySelectorAll(".admin-nav-button");
  const views = document.querySelectorAll(".admin-view");
  const title = document.getElementById("adminPageTitle");

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminView === viewName);
  });

  views.forEach((view) => {
    view.classList.toggle("active", view.dataset.adminViewPanel === viewName);
  });

  const titleMap = {
    dashboard: "Übersicht",
    tickets: "Tickets",
    applications: "Bewerbungen",
    reports: "Reports",
    bugs: "Bugs",
    settings: "Einstellungen"
  };

  if (title) {
    title.textContent = titleMap[viewName] || "Admin Panel";
  }
}

async function adminLoadProfile() {
  const { data: sessionData, error: sessionError } = await adminSupabaseClient.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const session = sessionData.session;

  if (!session || !session.user) {
    adminSettings.user = null;
    adminSettings.profile = null;
    return false;
  }

  adminSettings.user = session.user;

  const { data: profile, error } = await adminSupabaseClient
    .from("profiles")
    .select("id,email,role,created_at")
    .eq("id", session.user.id)
    .single();

  if (error) {
    throw error;
  }

  adminSettings.profile = profile;

  return adminAllowedRoles.includes(profile.role);
}

function adminUpdateUserDisplay() {
  const role = document.getElementById("adminUserRole");
  const email = document.getElementById("adminUserEmail");
  const connection = document.getElementById("adminConnectionStatus");

  if (role) {
    role.textContent = `Rolle: ${adminSettings.profile?.role || "unbekannt"}`;
  }

  if (email) {
    email.textContent = adminSettings.user?.email || "Nicht angemeldet";
  }

  if (connection) {
    connection.textContent = "Admin-Panel ist mit Supabase verbunden.";
  }
}

async function adminLoadTickets() {
  const { data, error } = await adminSupabaseClient
    .from("tickets")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  adminSettings.tickets = (data || []).map(adminNormalizeTicket);
}

async function adminLoadNotesForTicket(ticketId) {
  if (!ticketId) return;

  const { data, error } = await adminSupabaseClient
    .from("ticket_notes")
    .select("id,ticket_id,admin_user_id,note_text,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  adminSettings.notesByTicketId[ticketId] = data || [];
}

async function adminRefreshData() {
  await adminLoadTickets();
  adminRenderAll();

  if (adminSettings.selectedTicketId) {
    await adminLoadNotesForTicket(adminSettings.selectedTicketId);
    adminShowTicketDetail(adminSettings.selectedTicketId);
  }
}

function adminUpdateStats() {
  const tickets = adminSettings.tickets;

  const openCount = tickets.filter((ticket) => ticket.status === "open").length;
  const progressCount = tickets.filter((ticket) => ticket.status === "progress").length;
  const closedCount = tickets.filter((ticket) => ticket.status === "closed").length;

  const statOpen = document.getElementById("statOpen");
  const statProgress = document.getElementById("statProgress");
  const statClosed = document.getElementById("statClosed");
  const statTotal = document.getElementById("statTotal");

  if (statOpen) statOpen.textContent = openCount;
  if (statProgress) statProgress.textContent = progressCount;
  if (statClosed) statClosed.textContent = closedCount;
  if (statTotal) statTotal.textContent = tickets.length;
}

function adminRenderLatestTickets() {
  const container = document.getElementById("latestTickets");
  const tickets = adminSettings.tickets.slice(0, 5);

  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = adminCreateEmptyMessage("Noch keine Tickets in Supabase vorhanden.");
    return;
  }

  container.innerHTML = tickets
    .map((ticket) => {
      return `
        <div class="admin-mini-ticket">
          <strong>${adminEscape(ticket.title)}</strong>
          <span>${adminEscape(ticket.categoryLabel)} · ${adminFormatDate(ticket.createdAt)}</span>
          <div class="ticket-meta-row">
            <span class="ticket-badge ${adminEscape(ticket.status || "open")}">${adminGetStatusLabel(ticket.status || "open")}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function adminRenderTicketList() {
  const container = document.getElementById("ticketList");
  const filter = document.getElementById("ticketFilter");
  const tickets = adminSettings.tickets;

  if (!container) return;

  const filterValue = filter ? filter.value : "all";

  const filteredTickets = tickets.filter((ticket) => {
    if (filterValue === "all") return true;
    return (ticket.status || "open") === filterValue;
  });

  if (filteredTickets.length === 0) {
    container.innerHTML = adminCreateEmptyMessage("Keine Tickets für diesen Filter gefunden.");
    return;
  }

  container.innerHTML = filteredTickets
    .map((ticket) => {
      const isActive = adminSettings.selectedTicketId === ticket.id ? "active" : "";

      return `
        <button class="admin-ticket-item ${isActive}" data-ticket-id="${adminEscape(ticket.id)}">
          <strong>${adminEscape(ticket.title)}</strong>
          <span>${adminEscape(ticket.ticketNumber)} · ${adminEscape(ticket.discordUsername)} · ${adminFormatDate(ticket.createdAt)}</span>

          <div class="ticket-meta-row">
            <span class="ticket-badge category">${adminEscape(ticket.categoryLabel)}</span>
            <span class="ticket-badge ${adminEscape(ticket.status || "open")}">${adminGetStatusLabel(ticket.status || "open")}</span>
          </div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".admin-ticket-item").forEach((button) => {
    button.addEventListener("click", async () => {
      adminSettings.selectedTicketId = button.dataset.ticketId;
      await adminLoadNotesForTicket(adminSettings.selectedTicketId);
      adminRenderAll();
      adminShowTicketDetail(adminSettings.selectedTicketId);
    });
  });
}

function adminRenderCategoryList(category, containerId, emptyText) {
  const container = document.getElementById(containerId);
  const tickets = adminSettings.tickets.filter((ticket) => ticket.category === category);

  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = adminCreateEmptyMessage(emptyText);
    return;
  }

  container.innerHTML = tickets
    .map((ticket) => {
      return `
        <button class="admin-category-ticket" data-ticket-id="${adminEscape(ticket.id)}">
          <strong>${adminEscape(ticket.title)}</strong>
          <span>${adminEscape(ticket.ticketNumber)} · ${adminEscape(ticket.discordUsername)} · ${adminFormatDate(ticket.createdAt)}</span>

          <div class="ticket-meta-row">
            <span class="ticket-badge ${adminEscape(ticket.status || "open")}">${adminGetStatusLabel(ticket.status || "open")}</span>
          </div>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll(".admin-category-ticket").forEach((button) => {
    button.addEventListener("click", async () => {
      adminSettings.selectedTicketId = button.dataset.ticketId;
      await adminLoadNotesForTicket(adminSettings.selectedTicketId);
      adminSwitchView("tickets");
      adminRenderAll();
      adminShowTicketDetail(adminSettings.selectedTicketId);
    });
  });
}

function adminShowTicketDetail(ticketId) {
  const empty = document.getElementById("ticketDetailEmpty");
  const detail = document.getElementById("ticketDetail");
  const ticket = adminSettings.tickets.find((item) => item.id === ticketId);

  if (!empty || !detail) return;

  if (!ticket) {
    empty.style.display = "grid";
    detail.className = "admin-ticket-detail";
    detail.innerHTML = "";
    return;
  }

  empty.style.display = "none";
  detail.className = "admin-ticket-detail show";

  detail.innerHTML = `
    <div class="admin-detail-header">
      <div>
        <h2>${adminEscape(ticket.title)}</h2>
        <div class="admin-detail-id">${adminEscape(ticket.ticketNumber)} · ${adminFormatDate(ticket.createdAt)}</div>

        <div class="ticket-meta-row">
          <span class="ticket-badge category">${adminEscape(ticket.categoryLabel)}</span>
          <span class="ticket-badge ${adminEscape(ticket.status || "open")}">${adminGetStatusLabel(ticket.status || "open")}</span>
        </div>
      </div>

      <select id="detailStatusSelect" class="admin-status-select">
        <option value="open" ${ticket.status === "open" ? "selected" : ""}>Offen</option>
        <option value="progress" ${ticket.status === "progress" ? "selected" : ""}>In Bearbeitung</option>
        <option value="waiting" ${ticket.status === "waiting" ? "selected" : ""}>Wartet auf User</option>
        <option value="closed" ${ticket.status === "closed" ? "selected" : ""}>Geschlossen</option>
      </select>
    </div>

    <div class="admin-detail-grid">
      <div class="admin-detail-box">
        <span>Discord</span>
        <strong>${adminEscape(ticket.discordUsername)}</strong>
      </div>

      <div class="admin-detail-box">
        <span>Rang</span>
        <strong>${adminEscape(ticket.rank)}</strong>
      </div>

      <div class="admin-detail-box">
        <span>Bewerbungsbereich</span>
        <strong>${adminEscape(ticket.applicationArea)}</strong>
      </div>

      <div class="admin-detail-box">
        <span>Gemeldeter Spieler</span>
        <strong>${adminEscape(ticket.targetUser)}</strong>
      </div>

      <div class="admin-detail-box">
        <span>Beweise / Link</span>
        <strong>${adminEscape(ticket.proof)}</strong>
      </div>

      <div class="admin-detail-box">
        <span>Fehler nachstellen</span>
        <strong>${adminEscape(ticket.reproduce)}</strong>
      </div>
    </div>

    <div class="admin-description-box">
      <span>Beschreibung</span>
      <p>${adminEscape(ticket.description)}</p>
    </div>

    <div class="admin-actions-box">
      <div class="admin-actions-row">
        <button class="admin-action-button" id="setProgressButton">In Bearbeitung</button>
        <button class="admin-action-button" id="setWaitingButton">Wartet auf User</button>
        <button class="admin-action-button" id="setClosedButton">Ticket schließen</button>
      </div>

      <div class="admin-message-box">
        <textarea id="adminReplyText" class="admin-textarea" placeholder="Interne Antwort oder Notiz schreiben."></textarea>
        <button class="admin-action-button" id="saveReplyButton">Notiz speichern</button>
      </div>
    </div>

    <div class="admin-description-box">
      <span>Interne Notizen</span>
      <p>${adminRenderNotes(ticket.id)}</p>
    </div>
  `;

  const detailStatusSelect = document.getElementById("detailStatusSelect");
  const setProgressButton = document.getElementById("setProgressButton");
  const setWaitingButton = document.getElementById("setWaitingButton");
  const setClosedButton = document.getElementById("setClosedButton");
  const saveReplyButton = document.getElementById("saveReplyButton");

  if (detailStatusSelect) {
    detailStatusSelect.addEventListener("change", async () => {
      await adminUpdateTicketStatus(ticket.id, detailStatusSelect.value);
    });
  }

  if (setProgressButton) {
    setProgressButton.addEventListener("click", async () => {
      await adminUpdateTicketStatus(ticket.id, "progress");
    });
  }

  if (setWaitingButton) {
    setWaitingButton.addEventListener("click", async () => {
      await adminUpdateTicketStatus(ticket.id, "waiting");
    });
  }

  if (setClosedButton) {
    setClosedButton.addEventListener("click", async () => {
      await adminUpdateTicketStatus(ticket.id, "closed");
    });
  }

  if (saveReplyButton) {
    saveReplyButton.addEventListener("click", async () => {
      await adminSaveTicketNote(ticket.id);
    });
  }
}

function adminRenderNotes(ticketId) {
  const notes = adminSettings.notesByTicketId[ticketId] || [];

  if (notes.length === 0) {
    return "Noch keine internen Notizen vorhanden.";
  }

  return notes
    .map((note) => {
      return `${adminFormatDate(note.created_at)} — ${adminEscape(note.note_text)}`;
    })
    .join("\n\n");
}

async function adminUpdateTicketStatus(ticketId, status) {
  const { error } = await adminSupabaseClient
    .from("tickets")
    .update({
      status
    })
    .eq("id", ticketId);

  if (error) {
    alert("Status konnte nicht gespeichert werden.");
    return;
  }

  await adminRefreshData();
  adminShowTicketDetail(ticketId);
}

async function adminSaveTicketNote(ticketId) {
  const textarea = document.getElementById("adminReplyText");

  if (!textarea) return;

  const text = textarea.value.trim();

  if (!text) return;

  const { error } = await adminSupabaseClient
    .from("ticket_notes")
    .insert({
      ticket_id: ticketId,
      admin_user_id: adminSettings.user.id,
      note_text: text
    });

  if (error) {
    alert("Notiz konnte nicht gespeichert werden.");
    return;
  }

  textarea.value = "";
  await adminLoadNotesForTicket(ticketId);
  adminShowTicketDetail(ticketId);
}

function adminRenderAll() {
  adminUpdateStats();
  adminRenderLatestTickets();
  adminRenderTicketList();

  adminRenderCategoryList(
    "application",
    "applicationTickets",
    "Noch keine Bewerbungs-Tickets vorhanden."
  );

  adminRenderCategoryList(
    "report",
    "reportTickets",
    "Noch keine Reports vorhanden."
  );

  adminRenderCategoryList(
    "bug",
    "bugTickets",
    "Noch keine Bugmeldungen vorhanden."
  );
}

function adminSetupNavigation() {
  document.querySelectorAll(".admin-nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      adminSwitchView(button.dataset.adminView);
    });
  });
}

function adminSetupFilters() {
  const filter = document.getElementById("ticketFilter");

  if (!filter) return;

  filter.addEventListener("change", () => {
    adminRenderTicketList();
  });
}

function adminSetupActions() {
  const refreshButton = document.getElementById("adminRefreshButton");
  const logoutButton = document.getElementById("adminLogoutButton");

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await adminRefreshData();
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await adminSupabaseClient.auth.signOut();
      adminSettings.user = null;
      adminSettings.profile = null;
      adminSettings.tickets = [];
      adminSettings.selectedTicketId = null;
      adminShowLogin();
    });
  }
}

function adminSetupLogin() {
  const form = document.getElementById("adminLoginForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    adminHideLoginMessage();

    const email = document.getElementById("adminEmail")?.value.trim();
    const password = document.getElementById("adminPassword")?.value;

    if (!email || !password) {
      adminShowLoginMessage("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const { error } = await adminSupabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      adminShowLoginMessage("Login fehlgeschlagen. Prüfe E-Mail und Passwort.");
      return;
    }

    try {
      const allowed = await adminLoadProfile();

      if (!allowed) {
        await adminSupabaseClient.auth.signOut();
        adminShowLoginMessage("Dieser Account hat keine Admin-Berechtigung.");
        return;
      }

      adminShowApp();
      adminUpdateUserDisplay();
      await adminRefreshData();
    } catch (profileError) {
      adminShowLoginMessage("Profil konnte nicht geladen werden. Prüfe die Rolle in Supabase.");
    }
  });
}

async function adminInit() {
  try {
    await adminSetupSupabase();
  } catch (error) {
    adminShowLoginMessage(error.message || "Supabase konnte nicht geladen werden.");
    adminShowLogin();
    return;
  }

  adminSetupNavigation();
  adminSetupFilters();
  adminSetupActions();
  adminSetupLogin();

  try {
    const allowed = await adminLoadProfile();

    if (!allowed) {
      adminShowLogin();
      return;
    }

    adminShowApp();
    adminUpdateUserDisplay();
    await adminRefreshData();
  } catch (error) {
    adminShowLogin();
  }
}

document.addEventListener("DOMContentLoaded", adminInit);
