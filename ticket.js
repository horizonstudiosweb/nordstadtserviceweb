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
  if (!value) return "Unbekannt";
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
  element.textContent = text || "";
  element.className = `form-message ${type}`.trim();
}

function portalLoadScript(src) {
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

  if (ticket) ticketNumberInput.value = ticket;
  if (discord) discordNameInput.value = discord;
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

function portalRenderTicket(data) {
  const ticket = data.ticket;
  const messages = data.messages || [];

  ticketStatusBadge.textContent = portalStatusLabel(ticket.status);
  ticketStatusBadge.className = `status-badge ${ticket.status || "open"}`;

  ticketTitle.textContent = `${ticket.ticket_number} - ${ticket.title || "Ticket"}`;
  ticketMeta.textContent = `Erstellt am ${portalFormatDate(ticket.created_at)} · Letztes Update ${portalFormatDate(ticket.updated_at)}`;

  ticketCategory.textContent = ticket.category_label || ticket.category || "Support";
  ticketDiscord.textContent = ticket.discord_username || "Nicht angegeben";
  ticketDescription.textContent = ticket.description || "Keine Beschreibung";

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
  } else {
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
  }

  lookupCard.classList.add("hidden");
  ticketView.classList.remove("hidden");
}

async function portalOpenTicket(ticketNumber, discordName) {
  activeTicketNumber = ticketNumber.trim();
  activeDiscordName = discordName.trim();

  portalSetMessage(lookupMessage, "Ticket wird geladen...");

  const data = await portalLoadTicket(activeTicketNumber, activeDiscordName);
  portalRenderTicket(data);

  const url = new URL(window.location.href);
  url.searchParams.set("ticket", activeTicketNumber);
  url.searchParams.set("discord", activeDiscordName);
  window.history.replaceState({}, "", url.toString());

  portalSetMessage(lookupMessage, "");
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

    const data = await portalLoadTicket(activeTicketNumber, activeDiscordName);
    portalRenderTicket(data);

    portalSetMessage(replyMessage, "Antwort wurde gesendet.", "success");
  } catch (error) {
    portalSetMessage(replyMessage, error.message, "error");
  }
});

refreshTicketButton.addEventListener("click", async () => {
  try {
    const data = await portalLoadTicket(activeTicketNumber, activeDiscordName);
    portalRenderTicket(data);
    portalSetMessage(replyMessage, "Aktualisiert.", "success");
  } catch (error) {
    portalSetMessage(replyMessage, error.message, "error");
  }
});

changeTicketButton.addEventListener("click", () => {
  ticketView.classList.add("hidden");
  lookupCard.classList.remove("hidden");
  portalSetMessage(lookupMessage, "");
  portalSetMessage(replyMessage, "");

  const url = new URL(window.location.href);
  url.searchParams.delete("ticket");
  url.searchParams.delete("discord");
  window.history.replaceState({}, "", url.toString());
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
