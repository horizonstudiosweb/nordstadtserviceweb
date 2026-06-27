const supportSettings = {
  enabled: true,
  storageKey: "nordstadt_support_demo_tickets",
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
};

const supportFaqs = [
  {
    question: "Wie kann ich mich bewerben?",
    answer:
      "Bewerbungen laufen über den Support-Bereich oder über unseren Discord. Wähle die Kategorie Bewerbung aus und gib an, ob du dich für Administration, Support oder Leitung bewerben möchtest."
  },
  {
    question: "Wann gibt es neue Tests?",
    answer:
      "Neue Testphasen werden über den Discord-Server angekündigt. Auf der Website findest du zusätzlich im Tab Tests aktuelle Informationen."
  },
  {
    question: "Wie melde ich einen Bug?",
    answer:
      "Wähle im Support-Fenster die Kategorie Bug melden aus. Beschreibe den Fehler möglichst genau und gib an, wie man ihn nachstellen kann."
  },
  {
    question: "Wie melde ich einen Spieler?",
    answer:
      "Wähle die Kategorie Report aus. Gib den Namen des Spielers, den Grund und möglichst Beweise oder Links an."
  }
];

const supportCategories = {
  general: {
    title: "Allgemeiner Support",
    icon: "message",
    description: "Für Fragen, Probleme, Hilfe oder sonstige Anliegen.",
    intro:
      "Erstelle ein Support-Ticket. Unser Team kann dein Anliegen später im Admin-Panel ansehen und bearbeiten."
  },
  application: {
    title: "Bewerbung",
    icon: "user",
    description: "Für Bewerbungen im Admin-, Support- oder Leitungsbereich.",
    intro:
      "Erstelle eine Bewerbung. Wähle den Bereich aus und beschreibe kurz deine Erfahrung und Motivation."
  },
  report: {
    title: "Report",
    icon: "shield",
    description: "Melde Spieler, Regelverstöße oder problematisches Verhalten.",
    intro:
      "Erstelle einen Report. Bitte gib möglichst genaue Informationen und Beweise an."
  },
  bug: {
    title: "Bug melden",
    icon: "bug",
    description: "Melde Fehler, Bugs oder technische Probleme.",
    intro:
      "Melde einen Bug. Beschreibe, was passiert ist und wie man den Fehler nachstellen kann."
  }
};

let activeSupportCategory = null;
let supportSupabaseClient = null;
let supportBackendReady = false;

function supportIcon(name) {
  const icons = {
    help: `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 18h.01M9.1 9a3 3 0 1 1 5.2 2c-.9.7-1.4 1.2-1.7 2.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" fill="none" stroke="currentColor" stroke-width="2.2"/>
      </svg>
    `,
    message: `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v6A3.5 3.5 0 0 1 16.5 15H10l-5 5v-5.2A3.5 3.5 0 0 1 4 12V5.5Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    user: `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M20 21a8 8 0 0 0-16 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="none" stroke="currentColor" stroke-width="2.1"/>
      </svg>
    `,
    shield: `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M12 7v5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M12 16h.01" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
      </svg>
    `,
    bug: `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M8 8h8v9a4 4 0 0 1-8 0V8Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M3 13h5M16 13h5M4 19l4-2M20 19l-4-2M4 7l4 2M20 7l-4 2" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
      </svg>
    `
  };

  return icons[name] || icons.help;
}

function supportCreateElement(tagName, className, textContent) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

function supportLoadScript(src) {
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

async function supportSetupSupabase() {
  try {
    await supportLoadScript("supabase-config.js");
    await supportLoadScript(supportSettings.supabaseJsUrl);

    if (!window.NordstadtSupabaseConfig || !window.NordstadtSupabaseConfig.getConfig) {
      supportBackendReady = false;
      return;
    }

    const config = window.NordstadtSupabaseConfig.getConfig();

    if (!config.enabled || !config.url || !config.anonKey) {
      supportBackendReady = false;
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      supportBackendReady = false;
      return;
    }

    supportSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
    supportBackendReady = true;
  } catch (error) {
    supportBackendReady = false;
  }
}

function supportGetStoredTickets() {
  try {
    const rawTickets = localStorage.getItem(supportSettings.storageKey);

    if (!rawTickets) {
      return [];
    }

    return JSON.parse(rawTickets);
  } catch (error) {
    return [];
  }
}

function supportSaveDemoTicket(ticket) {
  const tickets = supportGetStoredTickets();
  tickets.unshift(ticket);
  localStorage.setItem(supportSettings.storageKey, JSON.stringify(tickets));
}

async function supportSaveSupabaseTicket(ticket) {
  if (!supportSupabaseClient || !supportBackendReady) {
    throw new Error("Supabase ist nicht verbunden.");
  }

  const supabaseTicket = {
    ticket_number: ticket.id,
    category: ticket.category,
    category_label: ticket.categoryLabel,
    discord_username: ticket.discordUsername,
    rank: ticket.rank || null,
    title: ticket.title,
    description: ticket.description,
    application_area: ticket.applicationArea || null,
    target_user: ticket.targetUser || null,
    proof: ticket.proof || null,
    reproduce: ticket.reproduce || null,
    status: "open"
  };

  const { error } = await supportSupabaseClient
    .from("tickets")
    .insert(supabaseTicket);

  if (error) {
    throw error;
  }
}

function supportCreateTicketNumber() {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);

  return `NRP-${year}${month}-${random}`;
}

function supportShowView(viewName) {
  const views = document.querySelectorAll(".support-view");

  views.forEach((view) => {
    view.classList.toggle("active", view.dataset.supportView === viewName);
  });
}

function supportShowStatus(type, message) {
  const statusBox = document.getElementById("supportStatusMessage");

  if (!statusBox) return;

  statusBox.className = `support-status-message show ${type}`;
  statusBox.textContent = message;
}

function supportClearStatus() {
  const statusBox = document.getElementById("supportStatusMessage");

  if (!statusBox) return;

  statusBox.className = "support-status-message";
  statusBox.textContent = "";
}

function supportCheckRecruitmentPopup() {
  const widgetRoot = document.getElementById("supportWidgetRoot");
  const recruitmentPopup = document.getElementById("recruitmentPopup");

  if (!widgetRoot || !recruitmentPopup) return;

  const isRecruitmentVisible = recruitmentPopup.classList.contains("show");
  widgetRoot.classList.toggle("shift-up", isRecruitmentVisible);
}

function supportStartPopupWatcher() {
  supportCheckRecruitmentPopup();

  setInterval(() => {
    supportCheckRecruitmentPopup();
  }, 350);
}

function supportOpenPanel() {
  const panel = document.getElementById("supportPanel");

  if (!panel) return;

  panel.classList.add("open");
  supportShowView("home");
  supportClearStatus();
}

function supportClosePanel() {
  const panel = document.getElementById("supportPanel");

  if (!panel) return;

  panel.classList.remove("open");
}

function supportRenderFaqButtons() {
  const faqList = document.getElementById("supportFaqList");

  if (!faqList) return;

  faqList.innerHTML = "";

  supportFaqs.forEach((faq) => {
    const button = supportCreateElement("button", "support-faq-button", faq.question);
    button.type = "button";

    button.addEventListener("click", () => {
      const title = document.getElementById("supportAnswerTitle");
      const text = document.getElementById("supportAnswerText");

      if (title) title.textContent = faq.question;
      if (text) text.textContent = faq.answer;

      supportShowView("answer");
    });

    faqList.appendChild(button);
  });
}

function supportRenderCategoryButtons() {
  const categoryGrid = document.getElementById("supportCategoryGrid");

  if (!categoryGrid) return;

  categoryGrid.innerHTML = "";

  Object.entries(supportCategories).forEach(([key, category]) => {
    const button = supportCreateElement("button", "support-category-button");
    button.type = "button";

    button.innerHTML = `
      <div class="support-category-icon">${supportIcon(category.icon)}</div>
      <div class="support-category-content">
        <strong>${category.title}</strong>
        <span>${category.description}</span>
      </div>
    `;

    button.addEventListener("click", () => {
      supportOpenTicketForm(key);
    });

    categoryGrid.appendChild(button);
  });
}

function supportOpenTicketForm(categoryKey) {
  const category = supportCategories[categoryKey];

  if (!category) return;

  activeSupportCategory = categoryKey;

  const formTitle = document.getElementById("supportFormTitle");
  const formIntro = document.getElementById("supportFormIntro");
  const form = document.getElementById("supportTicketForm");
  const applicationField = document.getElementById("supportApplicationField");
  const rankField = document.getElementById("supportRankField");
  const targetUserField = document.getElementById("supportTargetUserField");
  const proofField = document.getElementById("supportProofField");
  const reproduceField = document.getElementById("supportReproduceField");
  const preview = document.getElementById("supportTicketPreview");

  if (formTitle) formTitle.textContent = category.title;
  if (formIntro) formIntro.textContent = category.intro;

  if (form) form.reset();

  if (applicationField) {
    applicationField.style.display = categoryKey === "application" ? "grid" : "none";
  }

  if (rankField) {
    rankField.style.display = categoryKey === "general" || categoryKey === "application" ? "grid" : "none";
  }

  if (targetUserField) {
    targetUserField.style.display = categoryKey === "report" ? "grid" : "none";
  }

  if (proofField) {
    proofField.style.display = categoryKey === "report" || categoryKey === "bug" ? "grid" : "none";
  }

  if (reproduceField) {
    reproduceField.style.display = categoryKey === "bug" ? "grid" : "none";
  }

  if (preview) {
    preview.classList.remove("show");
    preview.innerHTML = "";
  }

  supportClearStatus();
  supportShowView("form");
}

function supportCollectFormData() {
  const discordUsername = document.getElementById("supportDiscordUsername")?.value.trim() || "";
  const rank = document.getElementById("supportRank")?.value.trim() || "";
  const title = document.getElementById("supportTitle")?.value.trim() || "";
  const description = document.getElementById("supportDescription")?.value.trim() || "";
  const applicationArea = document.getElementById("supportApplicationArea")?.value || "";
  const targetUser = document.getElementById("supportTargetUser")?.value.trim() || "";
  const proof = document.getElementById("supportProof")?.value.trim() || "";
  const reproduce = document.getElementById("supportReproduce")?.value.trim() || "";

  return {
    category: activeSupportCategory,
    categoryLabel: supportCategories[activeSupportCategory]?.title || "Support",
    discordUsername,
    rank,
    title,
    description,
    applicationArea,
    targetUser,
    proof,
    reproduce
  };
}

function supportValidateTicket(data) {
  if (!data.category) {
    return "Bitte wähle eine Kategorie aus.";
  }

  if (!data.discordUsername) {
    return "Bitte gib deinen Discord-Username ein.";
  }

  if (!data.title) {
    return "Bitte gib einen Titel ein.";
  }

  if (!data.description) {
    return "Bitte beschreibe dein Anliegen.";
  }

  if (data.category === "application" && !data.applicationArea) {
    return "Bitte wähle aus, für welchen Bereich du dich bewerben möchtest.";
  }

  if (data.category === "report" && !data.targetUser) {
    return "Bitte gib an, welchen Spieler du melden möchtest.";
  }

  if (data.category === "bug" && !data.reproduce) {
    return "Bitte beschreibe kurz, wie man den Fehler nachstellen kann.";
  }

  return "";
}

async function supportSubmitTicket(event) {
  event.preventDefault();

  supportClearStatus();

  const data = supportCollectFormData();
  const validationError = supportValidateTicket(data);

  if (validationError) {
    supportShowStatus("error", validationError);
    return;
  }

  const ticket = {
    id: supportCreateTicketNumber(),
    status: "open",
    createdAt: new Date().toISOString(),
    ...data
  };

  try {
    if (supportBackendReady) {
      await supportSaveSupabaseTicket(ticket);
    } else {
      supportSaveDemoTicket(ticket);
    }

    const preview = document.getElementById("supportTicketPreview");

    if (preview) {
      preview.classList.add("show");
      preview.innerHTML = `
        <strong>Ticket erstellt: ${ticket.id}</strong>
        <span>Kategorie: ${ticket.categoryLabel}</span>
        <span>Status: Offen</span>
      `;
    }

    if (supportBackendReady) {
      supportShowStatus(
        "success",
        "Dein Ticket wurde erstellt und in Supabase gespeichert."
      );
    } else {
      supportShowStatus(
        "success",
        "Dein Ticket wurde im Demo-Modus lokal gespeichert. Supabase ist noch nicht verbunden."
      );
    }

    const form = document.getElementById("supportTicketForm");
    if (form) form.reset();
  } catch (error) {
    supportShowStatus(
      "error",
      "Das Ticket konnte nicht in Supabase gespeichert werden. Prüfe bitte die Supabase-Konfiguration und RLS-Policies."
    );
  }
}

function supportBuildWidget() {
  if (!supportSettings.enabled) return;

  if (document.getElementById("supportWidgetRoot")) return;

  const widget = supportCreateElement("div", "support-widget-root");
  widget.id = "supportWidgetRoot";

  widget.innerHTML = `
    <button id="supportLauncher" class="support-launcher" type="button">
      <div class="support-launcher-icon">${supportIcon("help")}</div>
      <div class="support-launcher-text">
        <strong>Brauchst du Hilfe?</strong>
        <span>Support & Meldungen</span>
      </div>
    </button>

    <div id="supportPanel" class="support-panel">
      <div class="support-panel-header">
        <div class="support-panel-title">
          <div class="support-panel-logo">${supportIcon("message")}</div>
          <div>
            <h3>Nordstadt Support</h3>
            <p>FAQ, Tickets, Bewerbungen, Reports und Bugmeldungen.</p>
          </div>
        </div>

        <button id="supportClose" class="support-close" type="button">×</button>
      </div>

      <div class="support-panel-body">
        <div class="support-view active" data-support-view="home">
          <div class="support-intro-card">
            <strong>Willkommen beim Support.</strong>
            <p>
              Prüfe zuerst die Schnellantworten. Wenn du nicht weiterkommst,
              kannst du ein Ticket oder eine Meldung erstellen.
            </p>
          </div>

          <h4 class="support-section-title">Schnellantworten</h4>
          <div id="supportFaqList" class="support-faq-list"></div>

          <h4 class="support-section-title">Ticket erstellen</h4>
          <div id="supportCategoryGrid" class="support-category-grid"></div>

          <div class="support-mini-note">
            Hinweis: Tickets werden jetzt mit Supabase verbunden. Falls Supabase nicht erreichbar ist,
            speichert die Website sie nur lokal im Demo-Modus.
          </div>
        </div>

        <div class="support-view" data-support-view="answer">
          <button class="support-back-button" type="button" data-support-back="home">
            Zurück
          </button>

          <div class="support-answer-box">
            <h4 id="supportAnswerTitle">Antwort</h4>
            <p id="supportAnswerText"></p>
          </div>

          <div class="support-form-actions">
            <button class="support-submit-button" type="button" data-support-human>
              Menschlichen Support kontaktieren
            </button>
          </div>
        </div>

        <div class="support-view" data-support-view="form">
          <button class="support-back-button" type="button" data-support-back="home">
            Zurück
          </button>

          <div class="support-form-header">
            <h4 id="supportFormTitle">Ticket</h4>
            <p id="supportFormIntro">Beschreibe dein Anliegen.</p>
          </div>

          <form id="supportTicketForm" class="support-form">
            <div class="support-field">
              <label for="supportDiscordUsername">Discord-Username</label>
              <input id="supportDiscordUsername" type="text" placeholder="Beispiel: username oder username#0000" autocomplete="off">
            </div>

            <div id="supportRankField" class="support-field">
              <label for="supportRank">Aktueller Rang</label>
              <input id="supportRank" type="text" placeholder="Zum Beispiel: Spieler, Tester, Teammitglied" autocomplete="off">
            </div>

            <div id="supportApplicationField" class="support-field">
              <label for="supportApplicationArea">Bewerbungsbereich</label>
              <select id="supportApplicationArea">
                <option value="">Bitte auswählen</option>
                <option value="Administration">Administration</option>
                <option value="Support">Support</option>
                <option value="Leitung">Leitung</option>
              </select>
            </div>

            <div id="supportTargetUserField" class="support-field">
              <label for="supportTargetUser">Gemeldeter Spieler</label>
              <input id="supportTargetUser" type="text" placeholder="Name oder Discord des Spielers" autocomplete="off">
            </div>

            <div class="support-field">
              <label for="supportTitle">Titel</label>
              <input id="supportTitle" type="text" placeholder="Kurzer Titel deines Anliegens" autocomplete="off">
            </div>

            <div class="support-field">
              <label for="supportDescription">Beschreibung</label>
              <textarea id="supportDescription" placeholder="Beschreibe dein Anliegen möglichst genau."></textarea>
            </div>

            <div id="supportProofField" class="support-field">
              <label for="supportProof">Beweise / Link</label>
              <input id="supportProof" type="text" placeholder="Screenshot-, Video- oder Beweislink" autocomplete="off">
            </div>

            <div id="supportReproduceField" class="support-field">
              <label for="supportReproduce">Wie kann man den Fehler nachstellen?</label>
              <textarea id="supportReproduce" placeholder="Beschreibe die Schritte, die zum Fehler führen."></textarea>
            </div>

            <div class="support-form-actions">
              <button class="support-submit-button" type="submit">
                Ticket erstellen
              </button>

              <button class="support-secondary-button" type="button" data-support-back="home">
                Abbrechen
              </button>
            </div>
          </form>

          <div id="supportStatusMessage" class="support-status-message"></div>
          <div id="supportTicketPreview" class="support-ticket-preview"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  supportRenderFaqButtons();
  supportRenderCategoryButtons();

  const launcher = document.getElementById("supportLauncher");
  const closeButton = document.getElementById("supportClose");
  const form = document.getElementById("supportTicketForm");

  if (launcher) {
    launcher.addEventListener("click", supportOpenPanel);
  }

  if (closeButton) {
    closeButton.addEventListener("click", supportClosePanel);
  }

  if (form) {
    form.addEventListener("submit", supportSubmitTicket);
  }

  document.querySelectorAll("[data-support-back]").forEach((button) => {
    button.addEventListener("click", () => {
      supportShowView(button.dataset.supportBack);
      supportClearStatus();
    });
  });

  document.querySelectorAll("[data-support-human]").forEach((button) => {
    button.addEventListener("click", () => {
      supportOpenTicketForm("general");
    });
  });

  supportStartPopupWatcher();
}

async function supportInit() {
  await supportSetupSupabase();
  supportBuildWidget();
}

document.addEventListener("DOMContentLoaded", supportInit);
