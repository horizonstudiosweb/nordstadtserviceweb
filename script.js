const websiteLinks = {
  discord: "https://discord.gg/pR2Yxb5RTh",
  game: "https://www.roblox.com/de/games/101669977836710/Nordstadt-Roleplay",
  bundespolizeiDocument: "https://drive.google.com/file/d/1t-MPyiy-5xwtz_gKgl1zr8JYi0EwvGuv/view?usp=sharing"
};

const introSettings = {
  enabled: true,
  totalDurationInSeconds: 5
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
  testing  = blauer leuchtender Punkt
  wip      = gelber Punkt
  closed   = roter Punkt

  Du kannst den Statusbereich jederzeit oben ändern.
*/

/*
  Intro:

  enabled: true  = Intro erscheint beim Öffnen der Website
  enabled: false = Intro ist ausgeschaltet
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

function openTab(tabName) {
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  sections.forEach((section) => {
    section.classList.toggle("active", section.id === tabName);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openTab(button.dataset.tab);
  });
});

openTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openTab(button.dataset.tabOpen);
  });
});

function createStatusCards() {
  if (!statusCardsContainer) return;

  statusCardsContainer.innerHTML = "";

  projectStatuses.forEach((project) => {
    const card = document.createElement("article");
    card.className = "status-card";

    card.innerHTML = `
      <div>
        <div class="status-top">
          <div>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
          </div>

          <span class="status-indicator ${project.status}"></span>
        </div>
      </div>

      <div class="status-label">${project.label}</div>
    `;

    statusCardsContainer.appendChild(card);
  });
}

function applyLinks() {
  if (discordButton) {
    discordButton.href = websiteLinks.discord;
  }

  if (applyButton) {
    applyButton.href = websiteLinks.discord;
  }
}

function setupIntro() {
  if (!introOverlay) return;

  if (!introSettings.enabled) {
    introOverlay.style.display = "none";
    return;
  }

  document.body.classList.add("intro-active");

  setTimeout(() => {
    introOverlay.classList.add("hide");
    document.body.classList.remove("intro-active");
  }, introSettings.totalDurationInSeconds * 1000);

  setTimeout(() => {
    introOverlay.style.display = "none";
  }, introSettings.totalDurationInSeconds * 1000 + 900);
}

function setupRecruitmentPopup() {
  if (!recruitmentPopup || !recruitmentPopupSettings.enabled) return;

  const title = recruitmentPopup.querySelector(".notification-content strong");
  const text = recruitmentPopup.querySelector(".notification-content p");

  if (title) title.textContent = recruitmentPopupSettings.title;
  if (text) text.textContent = recruitmentPopupSettings.text;

  setTimeout(() => {
    recruitmentPopup.classList.add("show");
  }, recruitmentPopupSettings.delayInSeconds * 1000);

  if (closeRecruitmentPopup) {
    closeRecruitmentPopup.addEventListener("click", () => {
      recruitmentPopup.classList.remove("show");
    });
  }
}

function openDownloadModal(link) {
  selectedDownloadLink = link;

  if (downloadModal) {
    downloadModal.classList.add("show");
  }
}

function closeDownloadModal() {
  selectedDownloadLink = "";

  if (downloadModal) {
    downloadModal.classList.remove("show");
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

createStatusCards();
applyLinks();
setupIntro();
setupRecruitmentPopup();
setupDownloads();

(function addNordstadtNavActions() {
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

  const actions = document.createElement("div");
  actions.className = "nav-right-actions";

  actions.innerHTML = `
    <a class="nav-action-button support-center" href="support-center.html">
      Support-Center
    </a>

    <a class="nav-action-button admin" href="admin.html">
      Admin-Panel
    </a>
  `;

  targetNav.appendChild(actions);
})();
