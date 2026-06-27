const supportCenterSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  createTicketFunctionName: "create-support-ticket",
  uploadBucket: "ticket-uploads",
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024,
  localTicketsKey: "nordstadt_my_tickets",
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
  const ticketNumber = result.ticket_number || result.ticket_id || "";
  const discordUsername = ticket.discord_username || "";
  const categoryConfig = getCategoryConfig(ticket.category);

  if (!ticketNumber || !discordUsername) {
    return;
  }

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

function createMyTicketsSection() {
  if (document.getElementById("myTicketsSection")) {
    return;
  }

  const section = document.createElement("section");
  section.id = "myTicketsSection";
  section.className = "my-tickets-section";

  section.innerHTML = `
    <div class="my-tickets-card">
      <div class="my-tickets-head">
        <div>
          <p class="my-tickets-eyebrow">Ticketübersicht</p>
          <h2>Meine Tickets</h2>
          <p>Hier siehst du Tickets, die du mit diesem Browser erstellt hast.</p>
        </div>

        <button class="my-tickets-clear" id="clearMyTicketsButton" type="button">
          Liste leeren
        </button>
      </div>

      <div class="my-tickets-list" id="myTicketsList"></div>
    </div>
  `;

  const footer = document.querySelector("footer");
  const main = document.querySelector("main");
  const target = footer?.parentNode || main || document.body;

  if (footer && footer.parentNode) {
    footer.parentNode.insertBefore(section, footer);
  } else {
    target.appendChild(section);
  }

  const style = document.createElement("style");
  style.textContent = `
    .my-tickets-section {
      width: min(1120px, calc(100% - 36px));
      margin: 0 auto 80px;
    }

    .my-tickets-card {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 34px;
      background:
        radial-gradient(circle at top left, rgba(117, 197, 255, 0.16), transparent 34%),
        rgba(255, 255, 255, 0.07);
      box-shadow: 0 26px 70px rgba(0, 0, 0, 0.26);
      padding: 28px;
      overflow: hidden;
    }

    .my-tickets-head {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-start;
      margin-bottom: 18px;
    }

    .my-tickets-eyebrow {
      margin: 0 0 8px;
      color: rgba(127, 178, 255, 0.92);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .my-tickets-head h2 {
      margin: 0;
      color: #ffffff;
      font-family: "Montserrat", sans-serif;
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 1;
      letter-spacing: -0.06em;
    }

    .my-tickets-head p:not(.my-tickets-eyebrow) {
      margin: 12px 0 0;
      color: rgba(237, 244, 255, 0.68);
      line-height: 1.6;
    }

    .my-tickets-clear {
      min-height: 42px;
      padding: 0 16px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
      cursor: pointer;
      font-weight: 900;
      white-space: nowrap;
    }

    .my-tickets-list {
      display: grid;
      gap: 12px;
    }

    .my-ticket-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.055);
    }

    .my-ticket-info {
      min-width: 0;
    }

    .my-ticket-top {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .my-ticket-number {
      color: #ffffff;
      font-weight: 950;
    }

    .my-ticket-pill {
      width: fit-content;
      padding: 6px 9px;
      border-radius: 999px;
      background: rgba(117, 197, 255, 0.12);
      color: #d7eeff;
      font-size: 11px;
      font-weight: 900;
    }

    .my-ticket-title {
      color: #ffffff;
      font-size: 16px;
      font-weight: 900;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .my-ticket-meta {
      margin-top: 6px;
      color: rgba(237, 244, 255, 0.58);
      font-size: 13px;
      line-height: 1.45;
    }

    .my-ticket-open {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 18px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ffffff, #dcecff);
      color: #07111f;
      font-weight: 950;
      text-decoration: none;
      white-space: nowrap;
    }

    .my-tickets-empty {
      padding: 18px;
      border: 1px dashed rgba(255, 255, 255, 0.18);
      border-radius: 24px;
      color: rgba(237, 244, 255, 0.68);
      line-height: 1.6;
      background: rgba(255, 255, 255, 0.035);
    }

    @media (max-width: 700px) {
      .my-tickets-head {
        display: grid;
      }

      .my-tickets-clear {
        width: 100%;
      }

      .my-ticket-item {
        grid-template-columns: 1fr;
      }

      .my-ticket-open {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);

  const clearButton = document.getElementById("clearMyTicketsButton");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      localStorage.removeItem(supportCenterSettings.localTicketsKey);
      renderMyTickets();
    });
  }
}

function renderMyTickets() {
  createMyTicketsSection();

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
    const ticketNumber = ticket.ticket_number || ticket.ticket_id || "Ticket";
    const discordUsername = ticket.discord_username || "";
    const ticketUrl = ticket.url || buildTicketUrl(ticketNumber, discordUsername);

    return `
      <article class="my-ticket-item">
        <div class="my-ticket-info">
          <div class="my-ticket-top">
            <span class="my-ticket-number">${escapeHtml(ticketNumber)}</span>
            <span class="my-ticket-pill">${escapeHtml(ticket.category_label || "Support")}</span>
            <span class="my-ticket-pill">${escapeHtml(ticket.status || "open")}</span>
          </div>

          <div class="my-ticket-title">${escapeHtml(ticket.title || "Ohne Titel")}</div>

          <div class="my-ticket-meta">
            Discord: ${escapeHtml(discordUsername || "Unbekannt")}
          </div>
        </div>

        <a class="my-ticket-open" href="${escapeHtml(ticketUrl)}">
          Öffnen
        </a>
      </article>
    `;
  }).join("");
}

function resetForm() {
  supportCenterForm.reset();
  setFormMessage("");
  successView.classList.add("hidden");
  supportCenterForm.classList.remove("hidden");
  successTicketNumber.textContent = "-";
  successTicketLink.href = "tickets.html";
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

function renderSuccess(result, ticket) {
  const config = getCategoryConfig(ticket.category);
  const ticketNumber = result.ticket_number || result.ticket_id || "";
  const discordUsername = ticket.discord_username || "";
  const ticketUrl = buildTicketUrl(ticketNumber, discordUsername);

  supportCenterForm.classList.add("hidden");
  successView.classList.remove("hidden");

  successTitle.textContent = result.message || config.successTitle;
  successText.textContent = config.successText;
  successTicketNumber.textContent = ticketNumber || "-";
  successTicketLink.href = ticketUrl;
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
