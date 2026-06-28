const websiteLinks = {
  discord: "https://discord.gg/pR2Yxb5RTh",
  game: "https://www.roblox.com/de/games/101669977836710/Nordstadt-Roleplay",
  bundespolizeiDocument: "https://drive.google.com/file/d/1t-MPyiy-5xwtz_gKgl1zr8JYi0EwvGuv/view?usp=sharing",
  supportCenter: "support-center.html",
  adminPanel: "admin.html"
};

const introSettings = {
  enabled: true,
  totalDurationInSeconds: 5,
  hideDelayInMilliseconds: 900
};

const recruitmentPopupSettings = {
  enabled: true,
  delayInSeconds: 8,
  title: "Bewirb dich jetzt",
  text: "Wir suchen Leitungspersonal und Administratoren für Nordstadt Roleplay."
};

const projectStatuses = [
  {
    name: "Nordstadt Roleplay",
    status: "wip",
    label: "Work in Progress",
    description: "Nordstadt Roleplay befindet sich aktuell in Entwicklung und Vorbereitung für öffentliche Tests."
  },
  {
    name: "Ausbildungen",
    status: "testing",
    label: "Teilweise verfügbar",
    description: "Die Bundespolizei-Ausbildung ist verfügbar. Weitere Ausbildungen folgen später."
  },
  {
    name: "Spielzugang",
    status: "wip",
    label: "Eingeschränkter Zugang",
    description: "Das Spiel ist noch nicht vollständig veröffentlicht und kann nur während bestimmter Testphasen verfügbar sein."
  }
];

/*
  Status-Optionen:

  active   = weißer leuchtender Punkt
  testing  = cyan/blauer leuchtender Punkt
  wip      = gelber Punkt
  closed   = roter Punkt

  Du kannst den Statusbereich jederzeit oben ändern.
*/

/*
  Intro:

  enabled: true  = Intro erscheint beim Öffnen der Website
  enabled: false = Intro ist ausgeschaltet

  totalDurationInSeconds bestimmt, wie lange das Intro sichtbar ist.
*/

/*
  Bewerbungs-Popup:

  enabled: true  = Pop-up erscheint
  enabled: false = Pop-up ist ausgeschaltet

  delayInSeconds bestimmt, nach wie vielen Sekunden das Pop-up erscheint.
*/

const navButtons = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".tab-section");
const openTabButtons = document.querySelectorAll("[data-tab-open]");
const statusCardsContainer = document.getElementById("statusCards");

const discordButton = document.getElementById("discordButton");
const applyButton = document.getElementById("applyButton");

const introOverlay = document.getElementById("introOverlay");

const recruitmentPopup = document.getElementById("recruitmentPopup");
const closeRecruitmentPopup = document.getElementById("closeRecruitmentPopup");

const downloadButtons = document.querySelectorAll(".download-btn");
const downloadModal = document.getElementById("downloadModal");
const cancelDownload = document.getElementById("cancelDownload");
const confirmDownload = document.getElementById("confirmDownload");

let selectedDownloadLink = "";
let recruitmentPopupTimer = null;

function safeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getFirstExistingSectionId() {
  const firstSection = document.querySelector(".tab-section");
  return firstSection ? firstSection.id : "";
}

function isValidTab(tabName) {
  if (!tabName) return false;
  return Boolean(document.getElementById(tabName));
}

function updateUrlHash(tabName) {
  if (!tabName) return;

  const currentHash = window.location.hash.replace("#", "");

  if (currentHash === tabName) {
    return;
  }

  try {
    history.replaceState(null, "", `#${tabName}`);
  } catch (_error) {
    window.location.hash = tabName;
  }
}

function openTab(tabName, options = {}) {
  const shouldScroll = options.shouldScroll !== false;
  const shouldUpdateHash = options.shouldUpdateHash === true;

  if (!isValidTab(tabName)) {
    return;
  }

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  sections.forEach((section) => {
    section.classList.toggle("active", section.id === tabName);
  });

  if (shouldUpdateHash) {
    updateUrlHash(tabName);
  }

  if (shouldScroll) {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}

function setupTabs() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openTab(button.dataset.tab, {
        shouldUpdateHash: true
      });
    });
  });

  openTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openTab(button.dataset.tabOpen, {
        shouldUpdateHash: true
      });
    });
  });

  const hashTab = window.location.hash.replace("#", "");
  const firstSectionId = getFirstExistingSectionId();

  if (isValidTab(hashTab)) {
    openTab(hashTab, {
      shouldScroll: false,
      shouldUpdateHash: false
    });
    return;
  }

  const activeSection = document.querySelector(".tab-section.active");

  if (activeSection) {
    openTab(activeSection.id, {
      shouldScroll: false,
      shouldUpdateHash: false
    });
    return;
  }

  if (firstSectionId) {
    openTab(firstSectionId, {
      shouldScroll: false,
      shouldUpdateHash: false
    });
  }
}

function createStatusCards() {
  if (!statusCardsContainer) return;

  statusCardsContainer.innerHTML = "";

  projectStatuses.forEach((project) => {
    const card = document.createElement("article");
    card.className = "status-card";

    const projectName = safeText(project.name);
    const projectStatus = safeText(project.status);
    const projectLabel = safeText(project.label);
    const projectDescription = safeText(project.description);

    card.innerHTML = `
      <div>
        <div class="status-top">
          <div>
            <h3>${projectName}</h3>
            <p>${projectDescription}</p>
          </div>

          <span class="status-indicator ${projectStatus}"></span>
        </div>
      </div>

      <div class="status-label">${projectLabel}</div>
    `;

    statusCardsContainer.appendChild(card);
  });
}

function applyLinks() {
  if (discordButton) {
    discordButton.href = websiteLinks.discord;
    discordButton.target = "_blank";
    discordButton.rel = "noopener noreferrer";
  }

  if (applyButton) {
    applyButton.href = websiteLinks.discord;
    applyButton.target = "_blank";
    applyButton.rel = "noopener noreferrer";
  }
}

function setupIntro() {
  if (!introOverlay) return;

  if (!introSettings.enabled) {
    introOverlay.style.display = "none";
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    introOverlay.style.display = "none";
    return;
  }

  document.body.classList.add("intro-active");

  const introDuration = Math.max(1, Number(introSettings.totalDurationInSeconds || 5)) * 1000;
  const hideDelay = Math.max(0, Number(introSettings.hideDelayInMilliseconds || 900));

  setTimeout(() => {
    introOverlay.classList.add("hide");
    document.body.classList.remove("intro-active");
  }, introDuration);

  setTimeout(() => {
    introOverlay.style.display = "none";
  }, introDuration + hideDelay);
}

function setupRecruitmentPopup() {
  if (!recruitmentPopup || !recruitmentPopupSettings.enabled) return;

  const title = recruitmentPopup.querySelector(".notification-content strong");
  const text = recruitmentPopup.querySelector(".notification-content p");
  const actionLink = recruitmentPopup.querySelector("a");

  if (title) title.textContent = recruitmentPopupSettings.title;
  if (text) text.textContent = recruitmentPopupSettings.text;

  if (actionLink) {
    actionLink.href = websiteLinks.discord;
    actionLink.target = "_blank";
    actionLink.rel = "noopener noreferrer";
  }

  const popupDelay = Math.max(0, Number(recruitmentPopupSettings.delayInSeconds || 0)) * 1000;

  recruitmentPopupTimer = setTimeout(() => {
    recruitmentPopup.classList.add("show");
  }, popupDelay);

  if (closeRecruitmentPopup) {
    closeRecruitmentPopup.addEventListener("click", () => {
      recruitmentPopup.classList.remove("show");

      if (recruitmentPopupTimer) {
        clearTimeout(recruitmentPopupTimer);
        recruitmentPopupTimer = null;
      }
    });
  }
}

function openDownloadModal(link) {
  selectedDownloadLink = link;

  if (downloadModal) {
    downloadModal.classList.add("show");
    document.body.classList.add("modal-active");
  }
}

function closeDownloadModal() {
  selectedDownloadLink = "";

  if (downloadModal) {
    downloadModal.classList.remove("show");
    document.body.classList.remove("modal-active");
  }
}

function setupDownloads() {
  downloadButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const documentName = button.dataset.document;

      if (documentName === "bundespolizei") {
        openDownloadModal(websiteLinks.bundespolizeiDocument);
      }
    });
  });

  if (cancelDownload) {
    cancelDownload.addEventListener("click", closeDownloadModal);
  }

  if (downloadModal) {
    downloadModal.addEventListener("click", (event) => {
      if (event.target === downloadModal) {
        closeDownloadModal();
      }
    });
  }

  if (confirmDownload) {
    confirmDownload.addEventListener("click", () => {
      if (selectedDownloadLink) {
        window.open(selectedDownloadLink, "_blank", "noopener,noreferrer");
      }

      closeDownloadModal();
    });
  }
}

function setupKeyboardActions() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDownloadModal();

      if (recruitmentPopup) {
        recruitmentPopup.classList.remove("show");
      }
    }
  });
}

function addNordstadtNavActions() {
  const existingActions = document.querySelector(".nav-right-actions");

  if (existingActions) {
    return;
  }

  const possibleNavSelectors = [
    ".navbar",
    ".nav",
    ".navigation",
    ".nav-links",
    "header nav",
    "nav"
  ];

  let targetNav = null;

  for (const selector of possibleNavSelectors) {
    const element = document.querySelector(selector);

    if (element) {
      targetNav = element;
      break;
    }
  }

  if (!targetNav) {
    return;
  }

  const headerContainer =
    targetNav.closest("header") ||
    targetNav.closest(".navbar") ||
    targetNav.closest(".nav") ||
    targetNav.closest(".navigation") ||
    targetNav;

  headerContainer.classList.add("nav-expanded-safe");

  const actions = document.createElement("div");
  actions.className = "nav-right-actions";

  actions.innerHTML = `
    <a class="nav-action-button support-center" href="${websiteLinks.supportCenter}">
      Support-Center
    </a>

    <a class="nav-action-button admin" href="${websiteLinks.adminPanel}">
      Admin-Panel
    </a>
  `;

  headerContainer.appendChild(actions);
}

function setupPageVisibilityCleanup() {
  window.addEventListener("beforeunload", () => {
    document.body.classList.remove("intro-active");
    document.body.classList.remove("modal-active");
  });
}

function initNordstadtWebsite() {
  setupTabs();
  createStatusCards();
  applyLinks();
  setupIntro();
  setupRecruitmentPopup();
  setupDownloads();
  setupKeyboardActions();
  addNordstadtNavActions();
  setupPageVisibilityCleanup();
}

initNordstadtWebsite();
