const ticketPortalSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  currentTicketNumber: "",
  currentDiscordName: "",
  currentTicket: null,
  currentMessages: []
};

let ticketSupabaseClient = null;

const ticketLookupForm = document.getElementById("ticketLookupForm");
const ticketNumberInput = document.getElementById("ticketNumberInput");
const discordNameInput = document.getElementById("discordNameInput");
const lookupMessage = document.getElementById("lookupMessage");

const lookupCard = document.getElementById("lookupCard");
const ticketView = document.getElementById("ticketView");

const ticketStatusBadge = document.getElementById("ticketStatusBadge");
const ticketTitle = document.getElementById("ticketTitle");
const ticketMeta = document.getElementById("ticketMeta");
const ticketCategory = document.getElementById("ticketCategory");
const ticketDiscord = document.getElementById("ticketDiscord");
const ticketStatusText = document.getElementById("ticketStatusText");
const ticketDescription = document.getElementById("ticketDescription");
const closedReasonBox = document.getElementById("closedReasonBox");
const ticketClosedReason = document.getElementById("ticketClosedReason");

const ticketMessages = document.getElementById("ticketMessages");
const ticketReplyForm = document.getElementById("ticketReplyForm");
const ticketReplyInput = document.getElementById("ticketReplyInput");
const replyMessage = document.getElementById("replyMessage");
const closedNotice = document.getElementById("closedNotice");

const refreshTicketButton = document.getElementById("refreshTicketButton");
const refreshTicketButtonTop = document.getElementById("refreshTicketButtonTop");
const changeTicketButton = document.getElementById("changeTicketButton");

function ticketEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ticketFormatDate(value) {
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

function ticketStatusLabel(status) {
  const labels = {
    open: "Offen",
    in_progress: "In Bearbeitung",
    closed: "Geschlossen"
  };

  return labels[status] || status || "Unbekannt";
}

function ticketCategoryLabel(category, fallback) {
  const labels = {
    support: "Allgemeiner Support",
    application: "Bewerbung",
    report: "Spieler melden",
    bug: "Bug melden"
  };

  return fallback || labels[category] || category || "Support";
}

function setLookupMessage(text, type = "") {
  lookupMessage.textContent = text || "";
  lookupMessage.className = `form-message ${type}`.trim();
}

function setReplyMessage(text, type = "") {
  replyMessage.textContent = text || "";
  replyMessage.className = `form-message ${type}`.trim();
}

function ticketLoadScript(src) {
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

async function ticketSetupSupabase() {
  await ticketLoadScript("supabase-config.js");
  await ticketLoadScript(ticketPortalSettings.supabaseJsUrl);

  const config = window.NordstadtSupabaseConfig?.getConfig?.();

  if (!config || !config.enabled || !config.url || !config.anonKey) {
    throw new Error("Supabase ist nicht aktiviert.");
  }

  ticketSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
}

async function loadTicket(ticketNumber, discordName, options = {}) {
  const shouldShowLoading = options.showLoading !== false;

  if (shouldShowLoading) {
    setLookupMessage("Ticket wird geladen...");
  }

  const { data, error } = await ticketSupabaseClient.rpc("get_public_ticket_with_messages", {
    p_ticket_number: ticketNumber,
    p_discord_username: discordName
  });

  if (error) {
    throw new Error(error.message || "Ticket konnte nicht geladen werden.");
  }

  if (!data || data.success !== true) {
    throw new Error(data?.error || "Ticket nicht gefunden.");
  }

  ticketPortalSettings.currentTicketNumber = ticketNumber;
  ticketPortalSettings.currentDiscordName = discordName;
  ticketPortalSettings.currentTicket = data.ticket;
  ticketPortalSettings.currentMessages = data.messages || [];

  renderTicket(data.ticket, data.messages || []);
  updateUrl(ticketNumber, discordName);

  setLookupMessage("");
}

function updateUrl(ticketNumber, discordName) {
  const url = new URL(window.location.href);

  url.searchParams.set("ticket", ticketNumber);
  url.searchParams.set("discord", discordName);

  window.history.replaceState({}, "", url.toString());
}

function renderMessages(messages) {
  if (!messages.length) {
    ticketMessages.innerHTML = `
      <div class="message system">
        <div class="message-top">
          <span>System</span>
          <span>Jetzt</span>
        </div>
        <p>Noch keine Nachrichten vorhanden.</p>
      </div>
    `;
    return;
  }

  ticketMessages.innerHTML = messages.map((message) => `
    <div class="message ${ticketEscape(message.sender_type || "system")}">
      <div class="message-top">
        <span>${ticketEscape(message.sender_name || "Unbekannt")}</span>
        <span>${ticketEscape(ticketFormatDate(message.created_at))}</span>
      </div>
      <p>${ticketEscape(message.message_text)}</p>
    </div>
  `).join("");

  ticketMessages.scrollTop = ticketMessages.scrollHeight;
}

function renderTicket(ticket, messages) {
  const status = ticket.status || "open";
  const isClosed = status === "closed";

  lookupCard.classList.add("hidden");
  ticketView.classList.remove("hidden");

  ticketStatusBadge.textContent = ticketStatusLabel(status);
  ticketStatusBadge.className = `status-badge ${ticketEscape(status)}`;

  ticketTitle.textContent = `${ticket.ticket_number || "Ticket"} - ${ticket.title || "Ohne Titel"}`;

  ticketMeta.textContent = [
    `Erstellt ${ticketFormatDate(ticket.created_at)}`,
    `Letzte Aktivität ${ticketFormatDate(ticket.last_message_at || ticket.updated_at || ticket.created_at)}`
  ].join(" · ");

  ticketCategory.textContent = ticketCategoryLabel(ticket.category, ticket.category_label);
  ticketDiscord.textContent = ticket.discord_username || "Nicht angegeben";
  ticketStatusText.textContent = ticketStatusLabel(status);
  ticketDescription.textContent = ticket.description || "Keine Beschreibung vorhanden.";

  if (isClosed) {
    closedReasonBox.classList.remove("hidden");
    ticketClosedReason.textContent = ticket.closed_reason || "Kein Grund angegeben.";
    ticketReplyForm.classList.add("hidden");
    closedNotice.classList.remove("hidden");
  } else {
    closedReasonBox.classList.add("hidden");
    ticketClosedReason.textContent = "";
    ticketReplyForm.classList.remove("hidden");
    closedNotice.classList.add("hidden");
  }

  renderMessages(messages);
}

async function refreshCurrentTicket() {
  if (!ticketPortalSettings.currentTicketNumber || !ticketPortalSettings.currentDiscordName) {
    return;
  }

  setReplyMessage("Ticket wird aktualisiert...");

  try {
    await loadTicket(
      ticketPortalSettings.currentTicketNumber,
      ticketPortalSettings.currentDiscordName,
      { showLoading: false }
    );

    setReplyMessage("Aktualisiert.", "success");

    setTimeout(() => {
      setReplyMessage("");
    }, 1400);
  } catch (error) {
    setReplyMessage(error.message, "error");
  }
}

async function sendReply() {
  const text = ticketReplyInput.value.trim();

  if (!text) {
    return;
  }

  if (!ticketPortalSettings.currentTicketNumber || !ticketPortalSettings.currentDiscordName) {
    setReplyMessage("Kein Ticket geladen.", "error");
    return;
  }

  if (ticketPortalSettings.currentTicket?.status === "closed") {
    setReplyMessage("Dieses Ticket ist geschlossen. Du kannst nicht mehr antworten.", "error");
    return;
  }

  setReplyMessage("Antwort wird gesendet...");

  const { data, error } = await ticketSupabaseClient.rpc("send_public_ticket_message", {
    p_ticket_number: ticketPortalSettings.currentTicketNumber,
    p_discord_username: ticketPortalSettings.currentDiscordName,
    p_message_text: text
  });

  if (error) {
    setReplyMessage(error.message || "Antwort konnte nicht gesendet werden.", "error");
    return;
  }

  if (!data || data.success !== true) {
    setReplyMessage(data?.error || "Antwort konnte nicht gesendet werden.", "error");
    return;
  }

  ticketReplyInput.value = "";
  setReplyMessage("Antwort wurde gesendet.", "success");

  await loadTicket(
    ticketPortalSettings.currentTicketNumber,
    ticketPortalSettings.currentDiscordName,
    { showLoading: false }
  );

  setTimeout(() => {
    setReplyMessage("");
  }, 1600);
}

function resetTicketView() {
  ticketPortalSettings.currentTicketNumber = "";
  ticketPortalSettings.currentDiscordName = "";
  ticketPortalSettings.currentTicket = null;
  ticketPortalSettings.currentMessages = [];

  ticketView.classList.add("hidden");
  lookupCard.classList.remove("hidden");

  setLookupMessage("");
  setReplyMessage("");

  const url = new URL(window.location.href);
  url.searchParams.delete("ticket");
  url.searchParams.delete("discord");
  window.history.replaceState({}, "", url.toString());

  ticketNumberInput.focus();
}

ticketLookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const ticketNumber = ticketNumberInput.value.trim();
  const discordName = discordNameInput.value.trim();

  if (!ticketNumber || !discordName) {
    setLookupMessage("Bitte Ticketnummer und Discord-Namen eingeben.", "error");
    return;
  }

  try {
    await loadTicket(ticketNumber, discordName);
  } catch (error) {
    setLookupMessage(error.message, "error");
  }
});

ticketReplyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendReply();
});

refreshTicketButton.addEventListener("click", refreshCurrentTicket);
refreshTicketButtonTop.addEventListener("click", refreshCurrentTicket);
changeTicketButton.addEventListener("click", resetTicketView);

(async function initTicketPortal() {
  try {
    await ticketSetupSupabase();

    const params = new URLSearchParams(window.location.search);
    const ticketNumber = params.get("ticket") || "";
    const discordName = params.get("discord") || "";

    if (ticketNumber) {
      ticketNumberInput.value = ticketNumber;
    }

    if (discordName) {
      discordNameInput.value = discordName;
    }

    if (ticketNumber && discordName) {
      await loadTicket(ticketNumber, discordName);
    }
  } catch (error) {
    setLookupMessage(error.message, "error");
  }
})();
