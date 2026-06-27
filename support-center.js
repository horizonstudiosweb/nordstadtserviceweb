const supportCenterSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  createTicketFunctionName: "create-support-ticket",
  uploadBucket: "ticket-uploads",
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024,
  localTicketsKey: "nordstadt_my_tickets",
  currentInlineTicketNumber: "",
  currentInlineDiscordName: "",
  currentInlineTicket: null,
  categories: {
    support: {
      label: "Allgemein",
      modalTitle: "Allgemeines Ticket erstellen",
      modalDescription: "Beschreibe dein Anliegen möglichst genau. Ein Support Agent wird sich darum kümmern.",
      successTitle: "Ticket wurde erstellt.",
      successText: "Der Ticket-Chat kann direkt hier geöffnet werden.",
      submitText: "Ticket eröffnen"
    },
    application: {
      label: "Bewerbung",
      modalTitle: "Bewerbung einreichen",
      modalDescription: "Wähle deinen Bewerbungsbereich und schreibe deine Bewerbung sauber und ausführlich.",
      successTitle: "Bewerbung wurde erstellt.",
      successText: "Der Ticket-Chat kann direkt hier geöffnet werden.",
      submitText: "Bewerbung absenden"
    },
    report: {
      label: "Report",
      modalTitle: "Spieler melden",
      modalDescription: "Gib den gemeldeten User, den Vorfall und Beweise an.",
      successTitle: "Report wurde erstellt.",
      successText: "Der Ticket-Chat kann direkt hier geöffnet werden.",
      submitText: "Report weiterleiten"
    },
    bug: {
      label: "Bug / Fehler",
      modalTitle: "Bug / Fehler melden",
      modalDescription: "Beschreibe den Fehler, wie man ihn reproduzieren kann und lade optional Dateien oder Bilder hoch.",
      successTitle: "Bug wurde erstellt.",
      successText: "Der Ticket-Chat kann direkt hier geöffnet werden.",
      submitText: "Bug weiterleiten"
    }
  }
};

let supportCenterSupabaseClient = null;
let supportCenterReady = false;

const ticketModal = document.getElementById("ticketModal");
const ticketModalClose = document.getElementById("ticketModalClose");
const ticketModalCancel = document.getElementById("ticketModalCancel");

const modalCategoryEyebrow = document.getElementById("modalCategoryEyebrow");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");

const supportCenterForm = document.getElementById("supportCenterForm");
const ticketCategoryInput = document.getElementById("ticketCategoryInput");

const discordUsernameInput = document.getElementById("discordUsernameInput");
const rankInput = document.getElementById("rankInput");
const applicationAreaInput = document.getElementById("applicationAreaInput");
const targetUserInput = document.getElementById("targetUserInput");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const proofInput = document.getElementById("proofInput");
const reproduceInput = document.getElementById("reproduceInput");
const attachmentsInput = document.getElementById("attachmentsInput");

const applicationAreaField = document.getElementById("applicationAreaField");
const targetUserField = document.getElementById("targetUserField");
const proofField = document.getElementById("proofField");
const reproduceField = document.getElementById("reproduceField");
const attachmentsField = document.getElementById("attachmentsField");

const submitTicketButton = document.getElementById("submitTicketButton");
const ticketFormMessage = document.getElementById("ticketFormMessage");

const successView = document.getElementById("successView");
const successTitle = document.getElementById("successTitle");
const successText = document.getElementById("successText");
const successTicketNumber = document.getElementById("successTicketNumber");
const successTicketLink = document.getElementById("successTicketLink");
const successCloseButton = document.getElementById("successCloseButton");

const inlineTicketChat = document.getElementById("inlineTicketChat");
const inlineTicketTitle = document.getElementById("inlineTicketTitle");
const inlineTicketMeta = document.getElementById("inlineTicketMeta");
const inlineTicketCategory = document.getElementById("inlineTicketCategory");
const inlineTicketStatus = document.getElementById("inlineTicketStatus");
const inlineTicketDiscord = document.getElementById("inlineTicketDiscord");
const inlineTicketDescription = document.getElementById("inlineTicketDescription");
const inlineClosedReasonBox = document.getElementById("inlineClosedReasonBox");
const inlineClosedReason = document.getElementById("inlineClosedReason");
const inlineTicketMessages = document.getElementById("inlineTicketMessages");
const inlineClosedNotice = document.getElementById("inlineClosedNotice");
const inlineReplyForm = document.getElementById("inlineReplyForm");
const inlineReplyInput = document.getElementById("inlineReplyInput");
const inlineReplyMessage = document.getElementById("inlineReplyMessage");
const inlineRefreshTicketButton = document.getElementById("inlineRefreshTicketButton");

const openTicketButtons = document.querySelectorAll("[data-open-ticket]");

function injectInlineChatStyles() {
  if (document.getElementById("inlineTicketChatStyles")) return;

  const style = document.createElement("style");
  style.id = "inlineTicketChatStyles";
  style.textContent = `
    .inline-ticket-chat {
      width: 100%;
      margin-top: 26px;
      padding: 22px;
      border: 1px solid rgba(145, 190, 255, 0.16);
      border-radius: 28px;
      background:
        radial-gradient(circle at top left, rgba(117, 197, 255, 0.14), transparent 36%),
        rgba(255, 255, 255, 0.055);
      text-align: left;
    }

    .inline-ticket-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 16px;
    }

    .inline-ticket-head h3 {
      margin: 12px 0 0;
      color: #ffffff;
      font-size: clamp(30px, 4vw, 52px);
      line-height: 0.95;
      font-weight: 950;
      letter-spacing: -0.07em;
    }

    .inline-ticket-head p {
      margin: 10px 0 0;
      color: rgba(226, 238, 255, 0.7);
      line-height: 1.6;
    }

    .inline-ticket-info {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .inline-ticket-info div,
    .inline-ticket-description,
    .inline-closed-reason {
      padding: 14px;
      border: 1px solid rgba(145, 190, 255, 0.12);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.045);
    }

    .inline-ticket-info span,
    .inline-ticket-description span,
    .inline-closed-reason span {
      display: block;
      color: rgba(226, 238, 255, 0.48);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 7px;
    }

    .inline-ticket-info strong,
    .inline-ticket-description p,
    .inline-closed-reason p {
      margin: 0;
      color: #f7fbff;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .inline-closed-reason {
      margin-top: 12px;
      border-color: rgba(255, 224, 131, 0.24);
      background: rgba(255, 224, 131, 0.08);
    }

    .inline-ticket-messages {
      display: grid;
      gap: 12px;
      max-height: 380px;
      overflow: auto;
      margin-top: 16px;
      padding-right: 6px;
    }

    .inline-ticket-message {
      max-width: 86%;
      padding: 13px 15px;
      border: 1px solid rgba(145, 190, 255, 0.12);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.055);
    }

    .inline-ticket-message.user {
      margin-right: auto;
    }

    .inline-ticket-message.support {
      margin-left: auto;
      border-color: rgba(117, 197, 255, 0.28);
      background:
        radial-gradient(circle at top left, rgba(117, 197, 255, 0.16), transparent 42%),
        rgba(67, 164, 255, 0.1);
    }

    .inline-ticket-message.system {
      max-width: 100%;
      text-align: center;
      margin: 0 auto;
      color: rgba(226, 238, 255, 0.7);
    }

    .inline-ticket-message-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      color: rgba(226, 238, 255, 0.48);
      font-size: 12px;
      font-weight: 850;
    }

    .inline-ticket-message p {
      margin: 0;
      color: #f7fbff;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .inline-reply-form {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }

    .inline-reply-form textarea {
      width: 100%;
      min-height: 110px;
      resize: vertical;
      padding: 14px 15px;
      border: 1px solid rgba(145, 190, 255, 0.16);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.062);
      color: #f7fbff;
      outline: none;
      font-weight: 620;
      line-height: 1.55;
    }

    .inline-reply-form button {
      width: fit-content;
    }

    .inline-closed-notice {
      margin-top: 14px;
      padding: 14px 16px;
      border: 1px solid rgba(255, 224, 131, 0.24);
      border-radius: 18px;
      background: rgba(255, 224, 131, 0.08);
      color: #fff1b6;
      line-height: 1.55;
      font-weight: 700;
    }

    .my-ticket-open {
      border: 0;
      cursor: pointer;
    }

    @media (max-width: 760px) {
      .inline-ticket-head {
        display: grid;
      }

      .inline-ticket-info {
        grid-template-columns: 1fr;
      }

      .inline-ticket-message {
        max-width: 100%;
      }

      .inline-reply-form button {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Unbekannt";

  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusLabel(status) {
  const labels = {
    open: "Offen",
    in_progress: "In Bearbeitung",
    closed: "Geschlossen"
  };

  return labels[status] || status || "Unbekannt";
}

function categoryLabel(category, fallback) {
  const labels = {
    support: "Allgemeiner Support",
    application: "Bewerbung",
    report: "Spieler melden",
    bug: "Bug melden"
  };

  return fallback || labels[category] || category || "Support";
}

function setFormMessage(text, type = "") {
  if (!ticketFormMessage) return;

  ticketFormMessage.textContent = text || "";
  ticketFormMessage.className = `form-message ${type}`.trim();
}

function setInlineReplyMessage(text, type = "") {
  if (!inlineReplyMessage) return;

  inlineReplyMessage.textContent = text || "";
  inlineReplyMessage.className = `form-message ${type}`.trim();
}

function loadScript(src) {
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

async function setupSupabase() {
  if (supportCenterReady) return;

  await loadScript("supabase-config.js");
  await loadScript(supportCenterSettings.supabaseJsUrl);

  const config = window.NordstadtSupabaseConfig?.getConfig?.();

  if (!config || !config.enabled || !config.url || !config.anonKey) {
    throw new Error("Supabase ist nicht aktiviert. Prüfe supabase-config.js.");
  }

  supportCenterSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
  supportCenterReady = true;
}

function getCategoryConfig(category) {
  return supportCenterSettings.categories[category] || supportCenterSettings.categories.support;
}

function getLocalTickets() {
  try {
    const rawTickets = localStorage.getItem(supportCenterSettings.localTicketsKey);
    const tickets = JSON.parse(rawTickets || "[]");
    return Array.isArray(tickets) ? tickets : [];
  } catch (_error) {
    return [];
  }
}

function saveLocalTickets(tickets) {
  localStorage.setItem(supportCenterSettings.localTicketsKey, JSON.stringify(tickets));
}

function saveCreatedTicket(result, ticket) {
  const ticketNumber = result.ticket_number || "";
  const discordUsername = ticket.discord_username || "";

  if (!ticketNumber || !discordUsername) return;

  const categoryConfig = getCategoryConfig(ticket.category);
  const existingTickets = getLocalTickets();

  const newTicket = {
    ticket_number: ticketNumber,
    ticket_id: result.ticket_id || "",
    discord_username: discordUsername,
    title: ticket.title || "Ohne Titel",
    category: ticket.category || "support",
    category_label: result.category_label || categoryConfig.label || "Support",
    status: "open",
    created_at: new Date().toISOString()
  };

  const filteredTickets = existingTickets.filter((item) => {
    return item.ticket_number !== newTicket.ticket_number;
  });

  filteredTickets.unshift(newTicket);
  saveLocalTickets(filteredTickets.slice(0, 30));
  renderMyTickets();
}

function setupMyTicketsClearButton() {
  const clearButton = document.getElementById("clearMyTicketsButton");

  if (!clearButton || clearButton.dataset.ready === "true") return;

  clearButton.dataset.ready = "true";

  clearButton.addEventListener("click", () => {
    localStorage.removeItem(supportCenterSettings.localTicketsKey);
    renderMyTickets();
  });
}

function renderMyTickets() {
  setupMyTicketsClearButton();

  const list = document.getElementById("myTicketsList");
  if (!list) return;

  const tickets = getLocalTickets();

  if (!tickets.length) {
    list.innerHTML = `
      <div class="my-tickets-empty">
        Noch keine Tickets vorhanden. Sobald du ein Ticket erstellst, erscheint es hier automatisch.
      </div>
    `;
    return;
  }

  list.innerHTML = tickets.map((ticket) => `
    <article class="my-ticket-item">
      <div class="my-ticket-info">
        <div class="my-ticket-top">
          <span class="my-ticket-number">${escapeHtml(ticket.ticket_number || "Ticket")}</span>
          <span class="my-ticket-pill">${escapeHtml(ticket.category_label || "Support")}</span>
          <span class="my-ticket-pill">${escapeHtml(ticket.status || "open")}</span>
        </div>

        <div class="my-ticket-title">${escapeHtml(ticket.title || "Ohne Titel")}</div>

        <div class="my-ticket-meta">
          Discord: ${escapeHtml(ticket.discord_username || "Unbekannt")}
        </div>
      </div>

      <button
        class="my-ticket-open"
        type="button"
        data-ticket-number="${escapeHtml(ticket.ticket_number || "")}"
        data-discord-name="${escapeHtml(ticket.discord_username || "")}"
      >
        Öffnen
      </button>
    </article>
  `).join("");

  document.querySelectorAll("[data-ticket-number][data-discord-name]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openInlineTicketChat(
        button.dataset.ticketNumber || "",
        button.dataset.discordName || ""
      );
    });
  });
}

function resetForm() {
  supportCenterForm.reset();
  setFormMessage("");
  setInlineReplyMessage("");

  successView.classList.add("hidden");
  supportCenterForm.classList.remove("hidden");

  successTicketNumber.textContent = "-";

  inlineTicketChat.classList.add("hidden");
  inlineTicketMessages.innerHTML = "";
  inlineReplyInput.value = "";

  supportCenterSettings.currentInlineTicketNumber = "";
  supportCenterSettings.currentInlineDiscordName = "";
  supportCenterSettings.currentInlineTicket = null;
}

function openTicketModal(category) {
  const currentCategory = category || "support";
  const config = getCategoryConfig(currentCategory);

  resetForm();

  ticketCategoryInput.value = currentCategory;
  modalCategoryEyebrow.textContent = config.label;
  modalTitle.textContent = config.modalTitle;
  modalDescription.textContent = config.modalDescription;
  submitTicketButton.textContent = config.submitText;

  applicationAreaField.classList.toggle("hidden", currentCategory !== "application");
  targetUserField.classList.toggle("hidden", currentCategory !== "report");
  proofField.classList.toggle("hidden", currentCategory !== "report");
  reproduceField.classList.toggle("hidden", currentCategory !== "bug");
  attachmentsField.classList.toggle("hidden", currentCategory !== "bug" && currentCategory !== "report");

  if (currentCategory === "support") {
    titleInput.placeholder = "Kurzer Titel deines Anliegens";
    descriptionInput.placeholder = "Beschreibe dein Anliegen so genau wie möglich...";
  }

  if (currentCategory === "application") {
    titleInput.placeholder = "z. B. Bewerbung als Supporter";
    descriptionInput.placeholder = "Schreibe deine Bewerbung, Motivation, Erfahrung und warum du geeignet bist...";
  }

  if (currentCategory === "report") {
    titleInput.placeholder = "z. B. Regelverstoß / FailRP";
    descriptionInput.placeholder = "Beschreibe den Vorfall möglichst genau: Was ist passiert, wann, wo und wer war beteiligt?";
  }

  if (currentCategory === "bug") {
    titleInput.placeholder = "z. B. Fahrzeug despawnt nach Spawn";
    descriptionInput.placeholder = "Beschreibe den Fehler möglichst genau...";
  }

  ticketModal.classList.remove("hidden");

  setTimeout(() => {
    discordUsernameInput.focus();
  }, 80);
}

function closeTicketModal() {
  ticketModal.classList.add("hidden");
  resetForm();
}

function readTicketForm() {
  return {
    category: ticketCategoryInput.value.trim() || "support",
    discord_username: discordUsernameInput.value.trim(),
    rank: rankInput.value.trim(),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    application_area: applicationAreaInput.value.trim(),
    target_user: targetUserInput.value.trim(),
    proof: proofInput.value.trim(),
    reproduce: reproduceInput.value.trim()
  };
}

function validateTicket(ticket) {
  if (!ticket.discord_username) return "Bitte gib deinen Discord-Namen an.";
  if (!ticket.title || ticket.title.length < 3) return "Bitte gib einen richtigen Titel an.";
  if (!ticket.description || ticket.description.length < 10) return "Bitte beschreibe dein Anliegen genauer.";
  if (ticket.category === "application" && !ticket.application_area) return "Bitte gib an, für welchen Bereich du dich bewirbst.";
  if (ticket.category === "report" && !ticket.target_user) return "Bitte gib den gemeldeten User an.";
  if (ticket.category === "report" && !ticket.proof && (!attachmentsInput.files || attachmentsInput.files.length === 0)) return "Bitte gib Beweise als Link oder Datei an.";
  if (ticket.category === "bug" && !ticket.reproduce) return "Bitte beschreibe, wie man den Fehler reproduzieren kann.";
  return "";
}

function validateFiles(files) {
  if (!files || files.length === 0) return "";

  if (files.length > supportCenterSettings.maxFiles) {
    return `Du kannst maximal ${supportCenterSettings.maxFiles} Dateien hochladen.`;
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain"
  ];

  for (const file of files) {
    if (file.size > supportCenterSettings.maxFileSize) return `"${file.name}" ist größer als 10 MB.`;
    if (!allowedTypes.includes(file.type)) return `"${file.name}" hat einen nicht erlaubten Dateityp.`;
  }

  return "";
}

function safeFileName(fileName) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "file";
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß_-]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 42);

  return `${baseName || "datei"}.${extension}`;
}

async function uploadFiles(ticket) {
  const files = Array.from(attachmentsInput.files || []);

  if (!files.length) return [];

  const uploadedFiles = [];
  const folderName = `${ticket.category}/${Date.now()}-${crypto.randomUUID()}`;

  for (const file of files) {
    const filePath = `${folderName}/${safeFileName(file.name)}`;

    setFormMessage(`Datei wird hochgeladen: ${file.name}`);

    const { error: uploadError } = await supportCenterSupabaseClient.storage
      .from(supportCenterSettings.uploadBucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Datei konnte nicht hochgeladen werden: ${file.name}`);
    }

    const { data: publicUrlData } = supportCenterSupabaseClient.storage
      .from(supportCenterSettings.uploadBucket)
      .getPublicUrl(filePath);

    uploadedFiles.push({
      file_name: file.name,
      file_path: filePath,
      file_url: publicUrlData.publicUrl,
      file_type: file.type,
      file_size: file.size
    });
  }

  return uploadedFiles;
}

async function createTicket(ticket, attachments) {
  const { data, error } = await supportCenterSupabaseClient.functions.invoke(
    supportCenterSettings.createTicketFunctionName,
    {
      body: {
        ...ticket,
        attachments,
        page_url: window.location.href
      }
    }
  );

  if (error) throw new Error(error.message || "Ticket konnte nicht erstellt werden.");
  if (!data || data.success !== true) throw new Error(data?.error || "Ticket konnte nicht erstellt werden.");

  return data;
}

async function fetchPublicTicket(ticketNumber, discordName) {
  const { data, error } = await supportCenterSupabaseClient.rpc("get_public_ticket_with_messages", {
    p_ticket_number: ticketNumber,
    p_discord_username: discordName
  });

  if (error) throw new Error(error.message || "Ticket konnte nicht geladen werden.");
  if (!data || data.success !== true) throw new Error(data?.error || "Ticket nicht gefunden.");

  return data;
}

function renderInlineMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];

  if (!list.length) {
    inlineTicketMessages.innerHTML = `
      <div class="inline-ticket-message system">
        <div class="inline-ticket-message-top">
          <span>System</span>
          <span>Jetzt</span>
        </div>
        <p>Noch keine Nachrichten vorhanden.</p>
      </div>
    `;
    return;
  }

  inlineTicketMessages.innerHTML = list.map((message) => {
    const senderType = message.sender_type || message.author_type || "system";
    const senderName = message.sender_name || message.author_name || "Unbekannt";
    const text = message.message_text || message.content || message.message || "";

    return `
      <div class="inline-ticket-message ${escapeHtml(senderType)}">
        <div class="inline-ticket-message-top">
          <span>${escapeHtml(senderName)}</span>
          <span>${escapeHtml(formatDate(message.created_at))}</span>
        </div>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }).join("");

  inlineTicketMessages.scrollTop = inlineTicketMessages.scrollHeight;
}

function renderInlineTicket(ticket, messages) {
  const status = ticket.status || "open";
  const isClosed = status === "closed";

  supportCenterSettings.currentInlineTicket = ticket;

  inlineTicketChat.classList.remove("hidden");

  inlineTicketTitle.textContent = `${ticket.ticket_number || "Ticket"} - ${ticket.title || "Ohne Titel"}`;
  inlineTicketMeta.textContent = [
    `Erstellt ${formatDate(ticket.created_at)}`,
    `Letzte Aktivität ${formatDate(ticket.last_message_at || ticket.updated_at || ticket.created_at)}`
  ].join(" · ");

  inlineTicketCategory.textContent = categoryLabel(ticket.category, ticket.category_label);
  inlineTicketStatus.textContent = statusLabel(status);
  inlineTicketDiscord.textContent = ticket.discord_username || "Nicht angegeben";
  inlineTicketDescription.textContent = ticket.description || "Keine Beschreibung vorhanden.";

  if (isClosed) {
    inlineClosedReasonBox.classList.remove("hidden");
    inlineClosedReason.textContent = ticket.closed_reason || "Kein Grund angegeben.";
    inlineReplyForm.classList.add("hidden");
    inlineClosedNotice.classList.remove("hidden");
  } else {
    inlineClosedReasonBox.classList.add("hidden");
    inlineClosedReason.textContent = "";
    inlineReplyForm.classList.remove("hidden");
    inlineClosedNotice.classList.add("hidden");
  }

  renderInlineMessages(messages || []);
}

async function openInlineTicketChat(ticketNumber, discordName) {
  if (!ticketNumber || !discordName) {
    setFormMessage("Ticketnummer oder Discord-Name fehlt.", "error");
    return;
  }

  try {
    await setupSupabase();

    ticketModal.classList.remove("hidden");
    supportCenterForm.classList.add("hidden");
    successView.classList.remove("hidden");

    successTitle.textContent = "Ticket-Chat";
    successText.textContent = "Der Chat wurde direkt im Support-Center geöffnet.";
    successTicketNumber.textContent = ticketNumber;

    inlineTicketChat.classList.remove("hidden");
    inlineTicketMessages.innerHTML = `
      <div class="inline-ticket-message system">
        <div class="inline-ticket-message-top">
          <span>System</span>
          <span>Jetzt</span>
        </div>
        <p>Ticket wird geladen...</p>
      </div>
    `;

    supportCenterSettings.currentInlineTicketNumber = ticketNumber;
    supportCenterSettings.currentInlineDiscordName = discordName;

    const data = await fetchPublicTicket(ticketNumber, discordName);
    renderInlineTicket(data.ticket, data.messages || []);

    setInlineReplyMessage("");

    setTimeout(() => {
      inlineTicketChat.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);
  } catch (error) {
    setInlineReplyMessage(error.message || "Ticket konnte nicht geladen werden.", "error");
  }
}

async function refreshInlineTicket() {
  if (!supportCenterSettings.currentInlineTicketNumber || !supportCenterSettings.currentInlineDiscordName) return;

  setInlineReplyMessage("Ticket wird aktualisiert...");

  try {
    const data = await fetchPublicTicket(
      supportCenterSettings.currentInlineTicketNumber,
      supportCenterSettings.currentInlineDiscordName
    );

    renderInlineTicket(data.ticket, data.messages || []);
    setInlineReplyMessage("Aktualisiert.", "success");

    setTimeout(() => {
      setInlineReplyMessage("");
    }, 1300);
  } catch (error) {
    setInlineReplyMessage(error.message || "Aktualisierung fehlgeschlagen.", "error");
  }
}

async function sendInlineReply() {
  const text = inlineReplyInput.value.trim();

  if (!text) return;

  if (!supportCenterSettings.currentInlineTicketNumber || !supportCenterSettings.currentInlineDiscordName) {
    setInlineReplyMessage("Kein Ticket geladen.", "error");
    return;
  }

  if (supportCenterSettings.currentInlineTicket?.status === "closed") {
    setInlineReplyMessage("Dieses Ticket ist geschlossen. Du kannst nicht mehr antworten.", "error");
    return;
  }

  setInlineReplyMessage("Antwort wird gesendet...");

  const { data, error } = await supportCenterSupabaseClient.rpc("send_public_ticket_message", {
    p_ticket_number: supportCenterSettings.currentInlineTicketNumber,
    p_discord_username: supportCenterSettings.currentInlineDiscordName,
    p_message_text: text
  });

  if (error) {
    setInlineReplyMessage(error.message || "Antwort konnte nicht gesendet werden.", "error");
    return;
  }

  if (!data || data.success !== true) {
    setInlineReplyMessage(data?.error || "Antwort konnte nicht gesendet werden.", "error");
    return;
  }

  inlineReplyInput.value = "";
  setInlineReplyMessage("Antwort wurde gesendet.", "success");

  await refreshInlineTicket();

  setTimeout(() => {
    setInlineReplyMessage("");
  }, 1400);
}

function renderSuccess(result, ticket) {
  const config = getCategoryConfig(ticket.category);
  const ticketNumber = result.ticket_number || "";
  const discordUsername = ticket.discord_username || "";

  supportCenterForm.classList.add("hidden");
  successView.classList.remove("hidden");

  successTitle.textContent = result.message || config.successTitle;
  successText.textContent = config.successText;
  successTicketNumber.textContent = ticketNumber || "-";

  supportCenterSettings.currentInlineTicketNumber = ticketNumber;
  supportCenterSettings.currentInlineDiscordName = discordUsername;

  inlineTicketChat.classList.add("hidden");
  inlineReplyInput.value = "";
  setInlineReplyMessage("");
}

async function handleSubmit(event) {
  event.preventDefault();

  try {
    await setupSupabase();

    const ticket = readTicketForm();
    const validationError = validateTicket(ticket);

    if (validationError) {
      setFormMessage(validationError, "error");
      return;
    }

    const fileValidationError = validateFiles(attachmentsInput.files);

    if (fileValidationError) {
      setFormMessage(fileValidationError, "error");
      return;
    }

    const config = getCategoryConfig(ticket.category);

    submitTicketButton.disabled = true;
    submitTicketButton.textContent = "Wird vorbereitet...";
    setFormMessage("Ticket wird vorbereitet...");

    const attachments = await uploadFiles(ticket);

    submitTicketButton.textContent = "Ticket wird erstellt...";
    setFormMessage("Ticket wird erstellt und weitergeleitet...");

    const result = await createTicket(ticket, attachments);

    saveCreatedTicket(result, ticket);

    setFormMessage("");
    renderSuccess(result, ticket);

    submitTicketButton.disabled = false;
    submitTicketButton.textContent = config.submitText;
  } catch (error) {
    const category = ticketCategoryInput.value || "support";
    const config = getCategoryConfig(category);

    submitTicketButton.disabled = false;
    submitTicketButton.textContent = config.submitText;

    setFormMessage(error.message || "Ticket konnte nicht erstellt werden.", "error");
  }
}

openTicketButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openTicketModal(button.dataset.openTicket);
  });
});

ticketModalClose.addEventListener("click", closeTicketModal);
ticketModalCancel.addEventListener("click", closeTicketModal);
successCloseButton.addEventListener("click", closeTicketModal);

successTicketLink.addEventListener("click", async () => {
  await openInlineTicketChat(
    supportCenterSettings.currentInlineTicketNumber,
    supportCenterSettings.currentInlineDiscordName
  );
});

inlineRefreshTicketButton.addEventListener("click", refreshInlineTicket);

inlineReplyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendInlineReply();
});

ticketModal.addEventListener("click", (event) => {
  if (event.target === ticketModal) {
    closeTicketModal();
  }
});

supportCenterForm.addEventListener("submit", handleSubmit);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ticketModal.classList.contains("hidden")) {
    closeTicketModal();
  }
});

attachmentsInput.addEventListener("change", () => {
  const files = Array.from(attachmentsInput.files || []);

  if (!files.length) {
    setFormMessage("");
    return;
  }

  const validationError = validateFiles(files);

  if (validationError) {
    setFormMessage(validationError, "error");
    return;
  }

  const fileText = files.length === 1
    ? `1 Datei ausgewählt: ${files[0].name}`
    : `${files.length} Dateien ausgewählt.`;

  setFormMessage(fileText, "success");
});

(async function initSupportCenter() {
  try {
    injectInlineChatStyles();
    renderMyTickets();
    await setupSupabase();
  } catch (error) {
    setFormMessage(error.message, "error");
  }
})();
