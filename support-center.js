const supportCenterSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  createTicketFunctionName: "create-support-ticket",
  uploadBucket: "ticket-uploads",
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024,
  localTicketsKey: "nordstadt_my_tickets",
  lastCreatedTicketUrl: "",
  categories: {
    support: {
      label: "Allgemein",
      modalTitle: "Allgemeines Ticket erstellen",
      modalDescription: "Beschreibe dein Anliegen möglichst genau. Ein Support Agent wird sich darum kümmern.",
      successTitle: "Dein Anliegen wurde weitergeleitet.",
      successText: "Ein Support Agent wird sich um dein Anliegen kümmern.",
      submitText: "Ticket eröffnen"
    },
    application: {
      label: "Bewerbung",
      modalTitle: "Bewerbung einreichen",
      modalDescription: "Wähle deinen Bewerbungsbereich und schreibe deine Bewerbung sauber und ausführlich.",
      successTitle: "Deine Bewerbung wurde weitergeleitet.",
      successText: "Ein Support Agent wird deine Bewerbung prüfen.",
      submitText: "Bewerbung absenden"
    },
    report: {
      label: "Report",
      modalTitle: "Spieler melden",
      modalDescription: "Gib den gemeldeten User, den Vorfall und Beweise an.",
      successTitle: "Dein Report wurde weitergeleitet.",
      successText: "Ein Support Agent wird den Fall prüfen.",
      submitText: "Report weiterleiten"
    },
    bug: {
      label: "Bug / Fehler",
      modalTitle: "Bug / Fehler melden",
      modalDescription: "Beschreibe den Fehler, wie man ihn reproduzieren kann und lade optional Dateien oder Bilder hoch.",
      successTitle: "Dein Bug wurde weitergeleitet.",
      successText: "Unser Team prüft den Fehler.",
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

const embeddedTicketChatBox = document.getElementById("embeddedTicketChatBox");
const embeddedTicketChatFrame = document.getElementById("embeddedTicketChatFrame");

const openTicketButtons = document.querySelectorAll("[data-open-ticket]");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setFormMessage(text, type = "") {
  if (!ticketFormMessage) return;

  ticketFormMessage.textContent = text || "";
  ticketFormMessage.className = `form-message ${type}`.trim();
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
  if (supportCenterReady) {
    return;
  }

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

function getBasePageUrl() {
  return `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, "/")}`;
}

function buildTicketUrl(ticketNumber, discordUsername) {
  const url = new URL("tickets.html", getBasePageUrl());

  url.searchParams.set("ticket", ticketNumber || "");
  url.searchParams.set("discord", discordUsername || "");

  return url.toString();
}

function getLocalTickets() {
  try {
    const rawTickets = localStorage.getItem(supportCenterSettings.localTicketsKey);
    const tickets = JSON.parse(rawTickets || "[]");

    if (!Array.isArray(tickets)) {
      return [];
    }

    return tickets;
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

  if (!ticketNumber || !discordUsername) {
    return;
  }

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
    created_at: new Date().toISOString(),
    url: buildTicketUrl(ticketNumber, discordUsername)
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

  if (!clearButton || clearButton.dataset.ready === "true") {
    return;
  }

  clearButton.dataset.ready = "true";

  clearButton.addEventListener("click", () => {
    localStorage.removeItem(supportCenterSettings.localTicketsKey);
    renderMyTickets();
  });
}

function renderMyTickets() {
  setupMyTicketsClearButton();

  const list = document.getElementById("myTicketsList");

  if (!list) {
    return;
  }

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
    const ticketNumber = ticket.ticket_number || "";
    const discordUsername = ticket.discord_username || "";
    const ticketUrl = buildTicketUrl(ticketNumber, discordUsername);

    return `
      <article class="my-ticket-item">
        <div class="my-ticket-info">
          <div class="my-ticket-top">
            <span class="my-ticket-number">${escapeHtml(ticketNumber || "Ticket")}</span>
            <span class="my-ticket-pill">${escapeHtml(ticket.category_label || "Support")}</span>
            <span class="my-ticket-pill">${escapeHtml(ticket.status || "open")}</span>
          </div>

          <div class="my-ticket-title">${escapeHtml(ticket.title || "Ohne Titel")}</div>

          <div class="my-ticket-meta">
            Discord: ${escapeHtml(discordUsername || "Unbekannt")}
          </div>
        </div>

        <button class="my-ticket-open" type="button" data-open-local-ticket="${escapeHtml(ticketUrl)}">
          Öffnen
        </button>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-open-local-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      openEmbeddedTicketChat(button.dataset.openLocalTicket);
    });
  });
}

function resetForm() {
  supportCenterForm.reset();
  setFormMessage("");

  successView.classList.add("hidden");
  supportCenterForm.classList.remove("hidden");

  successTicketNumber.textContent = "-";
  supportCenterSettings.lastCreatedTicketUrl = "";

  if (embeddedTicketChatBox) {
    embeddedTicketChatBox.classList.add("hidden");
  }

  if (embeddedTicketChatFrame) {
    embeddedTicketChatFrame.removeAttribute("src");
  }
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
  if (!ticket.discord_username) {
    return "Bitte gib deinen Discord-Namen an.";
  }

  if (!ticket.title || ticket.title.length < 3) {
    return "Bitte gib einen richtigen Titel an.";
  }

  if (!ticket.description || ticket.description.length < 10) {
    return "Bitte beschreibe dein Anliegen genauer.";
  }

  if (ticket.category === "application" && !ticket.application_area) {
    return "Bitte gib an, für welchen Bereich du dich bewirbst.";
  }

  if (ticket.category === "report" && !ticket.target_user) {
    return "Bitte gib den gemeldeten User an.";
  }

  if (ticket.category === "report" && !ticket.proof && (!attachmentsInput.files || attachmentsInput.files.length === 0)) {
    return "Bitte gib Beweise als Link oder Datei an.";
  }

  if (ticket.category === "bug" && !ticket.reproduce) {
    return "Bitte beschreibe, wie man den Fehler reproduzieren kann.";
  }

  return "";
}

function validateFiles(files) {
  if (!files || files.length === 0) {
    return "";
  }

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

  if (!files.length) {
    return [];
  }

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
        page_url: getBasePageUrl()
      }
    }
  );

  if (error) {
    throw new Error(error.message || "Ticket konnte nicht erstellt werden.");
  }

  if (!data || data.success !== true) {
    throw new Error(data?.error || "Ticket konnte nicht erstellt werden.");
  }

  return data;
}

function openEmbeddedTicketChat(ticketUrl) {
  if (!ticketUrl || !embeddedTicketChatBox || !embeddedTicketChatFrame) {
    return;
  }

  ticketModal.classList.remove("hidden");
  successView.classList.remove("hidden");
  supportCenterForm.classList.add("hidden");

  embeddedTicketChatFrame.src = ticketUrl;
  embeddedTicketChatBox.classList.remove("hidden");

  setTimeout(() => {
    embeddedTicketChatBox.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
}

function renderSuccess(result, ticket) {
  const config = getCategoryConfig(ticket.category);
  const ticketNumber = result.ticket_number || "";
  const discordUsername = ticket.discord_username || "";
  const ticketUrl = buildTicketUrl(ticketNumber, discordUsername);

  supportCenterSettings.lastCreatedTicketUrl = ticketUrl;

  supportCenterForm.classList.add("hidden");
  successView.classList.remove("hidden");

  successTitle.textContent = result.message || config.successTitle;
  successText.textContent = "Der Ticket-Chat kann direkt hier geöffnet werden.";
  successTicketNumber.textContent = ticketNumber || "-";

  if (embeddedTicketChatBox) {
    embeddedTicketChatBox.classList.add("hidden");
  }

  if (embeddedTicketChatFrame) {
    embeddedTicketChatFrame.removeAttribute("src");
  }
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

successTicketLink.addEventListener("click", () => {
  openEmbeddedTicketChat(supportCenterSettings.lastCreatedTicketUrl);
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
    renderMyTickets();
    await setupSupabase();
  } catch (error) {
    setFormMessage(error.message, "error");
  }
})();
