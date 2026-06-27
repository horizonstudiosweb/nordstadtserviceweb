const adminSettings = {
  ticketStorageKey: "nordstadt_support_demo_tickets",
  selectedTicketId: null
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

function adminGetTickets() {
  try {
    const rawTickets = localStorage.getItem(adminSettings.ticketStorageKey);

    if (!rawTickets) {
      return [];
    }

    const tickets = JSON.parse(rawTickets);

    if (!Array.isArray(tickets)) {
      return [];
    }

    return tickets;
  } catch (error) {
    return [];
  }
}

function adminSaveTickets(tickets) {
  localStorage.setItem(adminSettings.ticketStorageKey, JSON.stringify(tickets));
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
  if (!dateString) {
    return "Unbekannt";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unbekannt";
  }

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function adminGetCategoryLabel(ticket) {
  return ticket.categoryLabel || adminCategoryLabels[ticket.category] || "Support";
}

function adminGetStatusLabel(status) {
  return adminStatusLabels[status] || "Offen";
}

function adminCreateEmptyMessage(text) {
  return `<div class="admin-empty">${text}</div>`;
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

function adminUpdateStats() {
  const tickets = adminGetTickets();

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
  const tickets = adminGetTickets().slice(0, 5);

  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = adminCreateEmptyMessage(
      "Noch keine Tickets vorhanden. Erstelle testweise ein Ticket über das Support-Fenster auf der Website."
    );
    return;
  }

  container.innerHTML = tickets
    .map((ticket) => {
      return `
        <div class="admin-mini-ticket">
          <strong>${adminEscape(ticket.title)}</strong>
          <span>${adminEscape(adminGetCategoryLabel(ticket))} · ${adminFormatDate(ticket.createdAt)}</span>
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
  const tickets = adminGetTickets();

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
          <span>${adminEscape(ticket.discordUsername)} · ${adminFormatDate(ticket.createdAt)}</span>

          <div class="ticket-meta-row">
            <span class="ticket-badge category">${adminEscape(adminGetCategoryLabel(ticket))}</span>
            <span class="ticket-badge ${adminEscape(ticket.status || "open")}">${adminGetStatusLabel(ticket.status || "open")}</span>
          </div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".admin-ticket-item").forEach((button) => {
    button.addEventListener("click", () => {
      adminSettings.selectedTicketId = button.dataset.ticketId;
      adminRenderAll();
      adminShowTicketDetail(adminSettings.selectedTicketId);
    });
  });
}

function adminRenderCategoryList(category, containerId, emptyText) {
  const container = document.getElementById(containerId);
  const tickets = adminGetTickets().filter((ticket) => ticket.category === category);

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
          <span>${adminEscape(ticket.discordUsername)} · ${adminFormatDate(ticket.createdAt)}</span>

          <div class="ticket-meta-row">
            <span class="ticket-badge ${adminEscape(ticket.status || "open")}">${adminGetStatusLabel(ticket.status || "open")}</span>
          </div>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll(".admin-category-ticket").forEach((button) => {
    button.addEventListener("click", () => {
      adminSettings.selectedTicketId = button.dataset.ticketId;
      adminSwitchView("tickets");
      adminRenderAll();
      adminShowTicketDetail(adminSettings.selectedTicketId);
    });
  });
}

function adminShowTicketDetail(ticketId) {
  const empty = document.getElementById("ticketDetailEmpty");
  const detail = document.getElementById("ticketDetail");
  const tickets = adminGetTickets();
  const ticket = tickets.find((item) => item.id === ticketId);

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
        <div class="admin-detail-id">${adminEscape(ticket.id)} · ${adminFormatDate(ticket.createdAt)}</div>

        <div class="ticket-meta-row">
          <span class="ticket-badge category">${adminEscape(adminGetCategoryLabel(ticket))}</span>
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
        <textarea id="adminReplyText" class="admin-textarea" placeholder="Interne Antwort oder Notiz schreiben. Im Demo-Modus wird sie lokal am Ticket gespeichert."></textarea>
        <button class="admin-action-button" id="saveReplyButton">Notiz speichern</button>
      </div>
    </div>

    <div class="admin-description-box">
      <span>Interne Notizen</span>
      <p>${adminRenderNotes(ticket)}</p>
    </div>
  `;

  const detailStatusSelect = document.getElementById("detailStatusSelect");
  const setProgressButton = document.getElementById("setProgressButton");
  const setWaitingButton = document.getElementById("setWaitingButton");
  const setClosedButton = document.getElementById("setClosedButton");
  const saveReplyButton = document.getElementById("saveReplyButton");

  if (detailStatusSelect) {
    detailStatusSelect.addEventListener("change", () => {
      adminUpdateTicketStatus(ticket.id, detailStatusSelect.value);
    });
  }

  if (setProgressButton) {
    setProgressButton.addEventListener("click", () => {
      adminUpdateTicketStatus(ticket.id, "progress");
    });
  }

  if (setWaitingButton) {
    setWaitingButton.addEventListener("click", () => {
      adminUpdateTicketStatus(ticket.id, "waiting");
    });
  }

  if (setClosedButton) {
    setClosedButton.addEventListener("click", () => {
      adminUpdateTicketStatus(ticket.id, "closed");
    });
  }

  if (saveReplyButton) {
    saveReplyButton.addEventListener("click", () => {
      adminSaveTicketNote(ticket.id);
    });
  }
}

function adminRenderNotes(ticket) {
  if (!ticket.notes || !Array.isArray(ticket.notes) || ticket.notes.length === 0) {
    return "Noch keine internen Notizen vorhanden.";
  }

  return ticket.notes
    .map((note) => {
      return `${adminFormatDate(note.createdAt)} — ${adminEscape(note.text)}`;
    })
    .join("\n\n");
}

function adminUpdateTicketStatus(ticketId, status) {
  const tickets = adminGetTickets();

  const updatedTickets = tickets.map((ticket) => {
    if (ticket.id !== ticketId) {
      return ticket;
    }

    return {
      ...ticket,
      status
    };
  });

  adminSaveTickets(updatedTickets);
  adminRenderAll();
  adminShowTicketDetail(ticketId);
}

function adminSaveTicketNote(ticketId) {
  const textarea = document.getElementById("adminReplyText");

  if (!textarea) return;

  const text = textarea.value.trim();

  if (!text) {
    return;
  }

  const tickets = adminGetTickets();

  const updatedTickets = tickets.map((ticket) => {
    if (ticket.id !== ticketId) {
      return ticket;
    }

    const notes = Array.isArray(ticket.notes) ? ticket.notes : [];

    return {
      ...ticket,
      notes: [
        {
          text,
          createdAt: new Date().toISOString()
        },
        ...notes
      ]
    };
  });

  adminSaveTickets(updatedTickets);
  textarea.value = "";
  adminRenderAll();
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
  const clearDemoTickets = document.getElementById("clearDemoTickets");

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      adminRenderAll();

      if (adminSettings.selectedTicketId) {
        adminShowTicketDetail(adminSettings.selectedTicketId);
      }
    });
  }

  if (clearDemoTickets) {
    clearDemoTickets.addEventListener("click", () => {
      const confirmed = confirm("Möchtest du wirklich alle lokalen Demo-Tickets löschen?");

      if (!confirmed) return;

      localStorage.removeItem(adminSettings.ticketStorageKey);
      adminSettings.selectedTicketId = null;
      adminRenderAll();
      adminShowTicketDetail(null);
    });
  }
}

function adminInit() {
  adminSetupNavigation();
  adminSetupFilters();
  adminSetupActions();
  adminRenderAll();
}

document.addEventListener("DOMContentLoaded", adminInit);
