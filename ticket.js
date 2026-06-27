const ticketPortalSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
};

let ticketSupabaseClient = null;
let activeTicketNumber = "";
let activeDiscordName = "";

const lookupCard = document.getElementById("lookupCard");
const ticketView = document.getElementById("ticketView");
const ticketLookupForm = document.getElementById("ticketLookupForm");
const ticketNumberInput = document.getElementById("ticketNumberInput");
const discordNameInput = document.getElementById("discordNameInput");
const lookupMessage = document.getElementById("lookupMessage");

const ticketStatusBadge = document.getElementById("ticketStatusBadge");
const ticketTitle = document.getElementById("ticketTitle");
const ticketMeta = document.getElementById("ticketMeta");
const ticketCategory = document.getElementById("ticketCategory");
const ticketDiscord = document.getElementById("ticketDiscord");
const ticketDescription = document.getElementById("ticketDescription");
const ticketMessages = document.getElementById("ticketMessages");
const ticketReplyForm = document.getElementById("ticketReplyForm");
const ticketReplyInput = document.getElementById("ticketReplyInput");
const replyMessage = document.getElementById("replyMessage");
const refreshTicketButton = document.getElementById("refreshTicketButton");
const changeTicketButton = document.getElementById("changeTicketButton");

function portalEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function portalFormatDate(value) {
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

function portalStatusLabel(status) {
  const labels = {
    open: "Offen",
    in_progress: "In Bearbeitung",
    closed: "Geschlossen"
  };

  return labels[status] || status || "Unbekannt";
}

function portalSetMessage(element, text, type = "") {
  if (!element) {
    return;
  }

  element.textContent = text || "";
  element.className = `form-message ${type}`.trim();
}

function portalLoadScript(src) {
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

async function portalSetupSupabase() {
  await portalLoadScript("supabase-config.js");
  await portalLoadScript(ticketPortalSettings.supabaseJsUrl);

  const config = window.NordstadtSupabaseConfig?.getConfig?.();

  if (!config || !config.enabled || !config.url || !config.anonKey) {
    throw new Error("Supabase ist nicht aktiviert.");
  }

  ticketSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
}

function portalReadUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const ticket = params.get("ticket");
  const discord = params.get("discord");

  if (ticket) {
    ticketNumberInput.value = ticket;
  }

  if (discord) {
    discordNameInput.value = discord;
  }
}

function portalWriteUrlParams(ticketNumber, discordName) {
  const url = new URL(window.location.href);
  url.searchParams.set("ticket", ticketNumber);
  url.searchParams.set("discord", discordName);
  window.history.replaceState({}, "", url.toString());
}

function portalClearUrlParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("ticket");
  url.searchParams.delete("discord");
  window.history.replaceState({}, "", url.toString());
}

async function portalLoadTicket(ticketNumber, discordName) {
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

  return data;
}

async function portalSendReply(text) {
  const { data, error } = await ticketSupabaseClient.rpc("send_public_ticket_message", {
    p_ticket_number: activeTicketNumber,
    p_discord_username: activeDiscordName,
    p_message_text: text
  });

  if (error) {
    throw new Error(error.message || "Antwort konnte nicht gesendet werden.");
  }

  if (!data || data.success !== true) {
    throw new Error(data?.error || "Antwort konnte nicht gesendet werden.");
  }
}

function portalRenderStatus(status) {
  ticketStatusBadge.textContent = portalStatusLabel(status);
  ticketStatusBadge.className = `status-badge ${status || "open"}`;
}

function portalRenderMessages(messages) {
  if (!messages || !messages.length) {
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

  ticketMessages.innerHTML = messages.map((message) => {
    const type = message.sender_type || "system";

    return `
      <div class="message ${portalEscape(type)}">
        <div class="message-top">
          <span>${portalEscape(message.sender_name || type)}</span>
          <span>${portalEscape(portalFormatDate(message.created_at))}</span>
        </div>
        <p>${portalEscape(message.message_text)}</p>
      </div>
    `;
  }).join("");

  ticketMessages.scrollTop = ticketMessages.scrollHeight;
}

function portalRenderTicket(data) {
  const ticket = data.ticket;
  const messages = data.messages || [];

  portalRenderStatus(ticket.status);

  ticketTitle.textContent = `${ticket.ticket_number} - ${ticket.title || "Ticket"}`;
  ticketMeta.textContent = `Erstellt am ${portalFormatDate(ticket.created_at)} · Letztes Update ${portalFormatDate(ticket.updated_at)}`;

  ticketCategory.textContent = ticket.category_label || ticket.category || "Support";
  ticketDiscord.textContent = ticket.discord_username || "Nicht angegeben";
  ticketDescription.textContent = ticket.description || "Keine Beschreibung";

  portalRenderMessages(messages);

  lookupCard.classList.add("hidden");
  ticketView.classList.remove("hidden");
}

async function portalOpenTicket(ticketNumber, discordName) {
  activeTicketNumber = ticketNumber.trim();
  activeDiscordName = discordName.trim();

  if (!activeTicketNumber || !activeDiscordName) {
    throw new Error("Bitte Ticketnummer und Discord-Name eingeben.");
  }

  portalSetMessage(lookupMessage, "Ticket wird geladen...");

  const data = await portalLoadTicket(activeTicketNumber, activeDiscordName);

  portalRenderTicket(data);
  portalWriteUrlParams(activeTicketNumber, activeDiscordName);

  portalSetMessage(lookupMessage, "");
}

async function portalRefreshActiveTicket(showMessage = true) {
  if (!activeTicketNumber || !activeDiscordName) {
    return;
  }

  const data = await portalLoadTicket(activeTicketNumber, activeDiscordName);

  portalRenderTicket(data);

  if (showMessage) {
    portalSetMessage(replyMessage, "Aktualisiert.", "success");
  }
}

function portalResetView() {
  activeTicketNumber = "";
  activeDiscordName = "";

  ticketView.classList.add("hidden");
  lookupCard.classList.remove("hidden");

  ticketNumberInput.value = "";
  discordNameInput.value = "";
  ticketReplyInput.value = "";

  portalSetMessage(lookupMessage, "");
  portalSetMessage(replyMessage, "");

  portalClearUrlParams();
}

ticketLookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await portalOpenTicket(ticketNumberInput.value, discordNameInput.value);
  } catch (error) {
    portalSetMessage(lookupMessage, error.message, "error");
  }
});

ticketReplyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = ticketReplyInput.value.trim();

  if (text.length < 2) {
    portalSetMessage(replyMessage, "Bitte schreibe eine längere Nachricht.", "error");
    return;
  }

  try {
    portalSetMessage(replyMessage, "Antwort wird gesendet...");

    await portalSendReply(text);

    ticketReplyInput.value = "";

    await portalRefreshActiveTicket(false);

    portalSetMessage(replyMessage, "Antwort wurde gesendet.", "success");
  } catch (error) {
    portalSetMessage(replyMessage, error.message, "error");
  }
});

refreshTicketButton.addEventListener("click", async () => {
  try {
    await portalRefreshActiveTicket(true);
  } catch (error) {
    portalSetMessage(replyMessage, error.message, "error");
  }
});

changeTicketButton.addEventListener("click", () => {
  portalResetView();
});

(async function initTicketPortal() {
  try {
    await portalSetupSupabase();
    portalReadUrlParams();

    if (ticketNumberInput.value && discordNameInput.value) {
      await portalOpenTicket(ticketNumberInput.value, discordNameInput.value);
    }
  } catch (error) {
    portalSetMessage(lookupMessage, error.message, "error");
  }
})();
