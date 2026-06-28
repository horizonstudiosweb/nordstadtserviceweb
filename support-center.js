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
  accountSystemEnabled: false,
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
let supportCenterSession = null;

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

const accountInfoCard = document.getElementById("accountInfoCard");
const accountInfoText = document.getElementById("accountInfoText");
const authGate = document.getElementById("authGate");
const logoutButton = document.getElementById("logoutButton");

const openTicketButtons = document.querySelectorAll("[data-open-ticket]");

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

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error(`${src} konnte nicht geladen werden.`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`${src} konnte nicht geladen werden.`));
    document.head.appendChild(script);
  });
}

async function setupSupabase() {
  if (supportCenterReady && supportCenterSupabaseClient) return;

  await loadScript("supabase-config.js");
  await loadScript(supportCenterSettings.supabaseJsUrl);

  const config = window.NordstadtSupabaseConfig?.getConfig?.();

  if (!config || !config.enabled || !config.url || !config.anonKey) {
    throw new Error("Supabase ist nicht aktiviert. Prüfe supabase-config.js.");
  }

  supportCenterSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
  supportCenterReady = true;

  try {
    const sessionResult = await supportCenterSupabaseClient.auth.getSession();
    supportCenterSession = sessionResult?.data?.session || null;
  } catch (_error) {
    supportCenterSession = null;
  }
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

  list.innerHTML = tickets.map((ticket) => {
    const ticketNumber = escapeHtml(ticket.ticket_number || "");
    const discordName = escapeHtml(ticket.discord_username || "");

    return `
      <article class="my-ticket-item">
        <div class="my-ticket-info">
          <div class="my-ticket-top">
            <span class="my-ticket-number">${escapeHtml(ticket.ticket_number || "Ticket")}</span>
            <span class="my-ticket-pill">${escapeHtml(ticket.category_label || "Support")}</span>
            <span class="my-ticket-pill">${escapeHtml(statusLabel(ticket.status || "open"))}</span>
          </div>

          <div class="my-ticket-title">${escapeHtml(ticket.title || "Ohne Titel")}</div>

          <div class="my-ticket-meta">
            Discord: ${escapeHtml(ticket.discord_username || "Unbekannt")}
          </div>
        </div>

        <button
          class="my-ticket-open"
          type="button"
          data-ticket-number="${ticketNumber}"
          data-discord-name="${discordName}"
        >
          Öffnen
        </button>
      </article>
    `;
  }).join("");

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
  if (supportCenterForm) {
    supportCenterForm.reset();
  }

  setFormMessage("");
  setInlineReplyMessage("");

  if (successView) {
    successView.classList.add("hidden");
  }

  if (supportCenterForm) {
    supportCenterForm.classList.remove("hidden");
  }

  if (successTicketNumber) {
    successTicketNumber.textContent = "-";
  }

  if (inlineTicketChat) {
    inlineTicketChat.classList.add("hidden");
  }

  if (inlineTicketMessages) {
    inlineTicketMessages.innerHTML = "";
  }

  if (inlineReplyInput) {
    inlineReplyInput.value = "";
  }

  supportCenterSettings.currentInlineTicketNumber = "";
  supportCenterSettings.currentInlineDiscordName = "";
  supportCenterSettings.currentInlineTicket = null;
}

function openTicketModal(category) {
  if (!ticketModal) return;

  const currentCategory = category || "support";
  const config = getCategoryConfig(currentCategory);

  if (supportCenterSettings.accountSystemEnabled && !supportCenterSession) {
    window.location.href = "auth.html";
    return;
  }

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
  document.body.classList.add("modal-active");

  setTimeout(() => {
    discordUsernameInput.focus();
  }, 80);
}

function closeTicketModal() {
  if (!ticketModal) return;

  ticketModal.classList.add("hidden");
  document.body.classList.remove("modal-active");
  resetForm();
}

function readTicketForm() {
  return {
    category: ticketCategoryInput.value.trim() || "support",
    discord_username: discordUsernameInput.value.trim(),
    rank: rankInput.value.trim(),
    roblox_username: rankInput.value.trim(),
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
    if (file.size > supportCenterSettings.maxFileSize) {
      return `"${file.name}" ist größer als 10 MB.`;
    }

    if (!allowedTypes.includes(file.type)) {
      return `"${file.name}" hat einen nicht erlaubten Dateityp.`;
    }
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
  const invokeOptions = {
    body: {
      ...ticket,
      attachments,
      page_url: window.location.href
    }
  };

  if (supportCenterSession?.access_token) {
    invokeOptions.headers = {
      Authorization: `Bearer ${supportCenterSession.access_token}`
    };
  }

  const { data, error } = await supportCenterSupabaseClient.functions.invoke(
    supportCenterSettings.createTicketFunctionName,
    invokeOptions
  );

  if (error) {
    throw new Error(error.message || "Ticket konnte nicht erstellt werden.");
  }

  if (!data || data.success !== true) {
    throw new Error(data?.error || "Ticket konnte nicht erstellt werden.");
  }

  return data;
}

async function fetchPublicTicket(ticketNumber, discordName) {
  const { data, error } = await supportCenterSupabaseClient.rpc("get_public_ticket_with_messages", {
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
    document.body.classList.add("modal-active");

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

    setButtonLoading(submitTicketButton, true, "Wird vorbereitet...", config.submitText);
    setFormMessage("Ticket wird vorbereitet...");

    const attachments = await uploadFiles(ticket);

    submitTicketButton.textContent = "Ticket wird erstellt...";
    setFormMessage("Ticket wird erstellt und weitergeleitet...");

    const result = await createTicket(ticket, attachments);

    saveCreatedTicket(result, ticket);

    setFormMessage("");
    renderSuccess(result, ticket);

    setButtonLoading(submitTicketButton, false, config.submitText, config.submitText);
  } catch (error) {
    const category = ticketCategoryInput.value || "support";
    const config = getCategoryConfig(category);

    setButtonLoading(submitTicketButton, false, config.submitText, config.submitText);
    setFormMessage(error.message || "Ticket konnte nicht erstellt werden.", "error");
  }
}

function setupTicketButtons() {
  openTicketButtons.forEach((button) => {
    if (button.dataset.ready === "true") return;

    button.dataset.ready = "true";

    button.addEventListener("click", () => {
      openTicketModal(button.dataset.openTicket);
    });
  });
}

function setupModalEvents() {
  if (ticketModalClose) {
    ticketModalClose.addEventListener("click", closeTicketModal);
  }

  if (ticketModalCancel) {
    ticketModalCancel.addEventListener("click", closeTicketModal);
  }

  if (successCloseButton) {
    successCloseButton.addEventListener("click", closeTicketModal);
  }

  if (successTicketLink) {
    successTicketLink.addEventListener("click", async () => {
      await openInlineTicketChat(
        supportCenterSettings.currentInlineTicketNumber,
        supportCenterSettings.currentInlineDiscordName
      );
    });
  }

  if (inlineRefreshTicketButton) {
    inlineRefreshTicketButton.addEventListener("click", refreshInlineTicket);
  }

  if (inlineReplyForm) {
    inlineReplyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await sendInlineReply();
    });
  }

  if (ticketModal) {
    ticketModal.addEventListener("click", (event) => {
      if (event.target === ticketModal) {
        closeTicketModal();
      }
    });
  }

  if (supportCenterForm) {
    supportCenterForm.addEventListener("submit", handleSubmit);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ticketModal && !ticketModal.classList.contains("hidden")) {
      closeTicketModal();
    }
  });
}

function setupAttachmentValidation() {
  if (!attachmentsInput) return;

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
}

async function setupAccountPreview() {
  if (!accountInfoCard && !authGate) return;

  if (!supportCenterSettings.accountSystemEnabled) {
    if (accountInfoCard) accountInfoCard.classList.add("hidden");
    if (authGate) authGate.classList.add("hidden");
    return;
  }

  await setupSupabase();

  if (supportCenterSession?.user) {
    if (authGate) authGate.classList.add("hidden");
    if (accountInfoCard) accountInfoCard.classList.remove("hidden");

    if (accountInfoText) {
      accountInfoText.textContent = `Angemeldet als ${supportCenterSession.user.email || "Kunde"}. Deine Tickets werden deinem Kundenkonto zugeordnet.`;
    }
  } else {
    if (accountInfoCard) accountInfoCard.classList.add("hidden");
    if (authGate) authGate.classList.remove("hidden");
  }
}

function setupLogoutButton() {
  if (!logoutButton || logoutButton.dataset.ready === "true") return;

  logoutButton.dataset.ready = "true";

  logoutButton.addEventListener("click", async () => {
    try {
      await setupSupabase();
      await supportCenterSupabaseClient.auth.signOut();
      supportCenterSession = null;
      await setupAccountPreview();
    } catch (_error) {
      window.location.href = "auth.html";
    }
  });
}

async function initSupportCenter() {
  try {
    renderMyTickets();
    setupTicketButtons();
    setupModalEvents();
    setupAttachmentValidation();
    setupLogoutButton();
    await setupSupabase();
    await setupAccountPreview();
  } catch (error) {
    setFormMessage(error.message || "Support-Center konnte nicht vollständig geladen werden.", "error");
  }
}

initSupportCenter();
