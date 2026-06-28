const authSettings = {
  supabaseJsUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  redirectAfterLogin: "support-center.html",
  redirectAfterRegister: "auth.html",
  minimumPasswordLength: 6
};

let authSupabaseClient = null;

const authTabs = document.querySelectorAll("[data-auth-tab]");
const authLoginView = document.getElementById("authLoginView");
const authRegisterView = document.getElementById("authRegisterView");
const authSessionBox = document.getElementById("authSessionBox");
const authSessionText = document.getElementById("authSessionText");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const registerForm = document.getElementById("registerForm");
const registerDisplayName = document.getElementById("registerDisplayName");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerPasswordConfirm = document.getElementById("registerPasswordConfirm");
const registerButton = document.getElementById("registerButton");
const registerMessage = document.getElementById("registerMessage");

const logoutButton = document.getElementById("logoutButton");

function getAuthRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  if (!redirect) {
    return authSettings.redirectAfterLogin;
  }

  const cleanRedirect = redirect.trim();

  if (!cleanRedirect) {
    return authSettings.redirectAfterLogin;
  }

  if (
    cleanRedirect.startsWith("http://") ||
    cleanRedirect.startsWith("https://") ||
    cleanRedirect.startsWith("//") ||
    cleanRedirect.includes("\\")
  ) {
    return authSettings.redirectAfterLogin;
  }

  return cleanRedirect;
}

function getRegisterRedirectUrl() {
  const redirectTarget = getAuthRedirectTarget();
  const authUrl = new URL(authSettings.redirectAfterRegister, window.location.href);

  if (redirectTarget) {
    authUrl.searchParams.set("redirect", redirectTarget);
  }

  return authUrl.toString();
}

function authSetMessage(element, text, type = "") {
  if (!element) return;

  element.textContent = text || "";
  element.className = `auth-message ${type}`.trim();
}

function authSetButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

function authLoadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true" || existingScript.src.includes(src)) {
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

async function authSetupSupabase() {
  if (authSupabaseClient) {
    return;
  }

  await authLoadScript("supabase-config.js");
  await authLoadScript(authSettings.supabaseJsUrl);

  const config = window.NordstadtSupabaseConfig?.getConfig?.();

  if (!config || !config.enabled || !config.url || !config.anonKey) {
    throw new Error("Supabase ist nicht aktiviert. Prüfe supabase-config.js.");
  }

  authSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
}

function authOpenTab(tabName) {
  authTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === tabName);
  });

  if (authLoginView) {
    authLoginView.classList.toggle("active", tabName === "login");
  }

  if (authRegisterView) {
    authRegisterView.classList.toggle("active", tabName === "register");
  }

  authSetMessage(loginMessage, "");
  authSetMessage(registerMessage, "");
}

function authShowSession(session) {
  const email = session?.user?.email || "Kunde";

  if (authLoginView) {
    authLoginView.classList.remove("active");
  }

  if (authRegisterView) {
    authRegisterView.classList.remove("active");
  }

  authTabs.forEach((button) => {
    button.classList.remove("active");
  });

  if (authSessionBox) {
    authSessionBox.classList.remove("hidden");
  }

  if (authSessionText) {
    authSessionText.textContent = `Du bist als ${email} angemeldet.`;
  }
}

function authShowForms() {
  if (authSessionBox) {
    authSessionBox.classList.add("hidden");
  }

  authOpenTab("login");
}

function authValidateRegisterForm() {
  const displayName = registerDisplayName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const passwordConfirm = registerPasswordConfirm.value;

  if (displayName.length < 2) {
    return "Bitte gib einen richtigen Anzeigenamen ein.";
  }

  if (!email || !email.includes("@")) {
    return "Bitte gib eine gültige E-Mail-Adresse ein.";
  }

  if (password.length < authSettings.minimumPasswordLength) {
    return `Dein Passwort muss mindestens ${authSettings.minimumPasswordLength} Zeichen haben.`;
  }

  if (password !== passwordConfirm) {
    return "Die Passwörter stimmen nicht überein.";
  }

  return "";
}

async function authHandleLogin(event) {
  event.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    authSetMessage(loginMessage, "Bitte E-Mail und Passwort eingeben.", "error");
    return;
  }

  try {
    authSetButtonLoading(loginButton, true, "Login läuft...", "Einloggen");
    authSetMessage(loginMessage, "Login läuft...");

    const { data, error } = await authSupabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message || "Login fehlgeschlagen.");
    }

    if (!data.session) {
      throw new Error("Login konnte nicht abgeschlossen werden.");
    }

    authSetMessage(loginMessage, "Login erfolgreich. Du wirst weitergeleitet...", "success");
    authShowSession(data.session);

    window.setTimeout(() => {
      window.location.href = getAuthRedirectTarget();
    }, 700);
  } catch (error) {
    authSetMessage(loginMessage, error.message || "Login fehlgeschlagen.", "error");
  } finally {
    authSetButtonLoading(loginButton, false, "Login läuft...", "Einloggen");
  }
}

async function authHandleRegister(event) {
  event.preventDefault();

  const validationError = authValidateRegisterForm();

  if (validationError) {
    authSetMessage(registerMessage, validationError, "error");
    return;
  }

  const displayName = registerDisplayName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;

  try {
    authSetButtonLoading(registerButton, true, "Konto wird erstellt...", "Konto erstellen");
    authSetMessage(registerMessage, "Konto wird erstellt...");

    const redirectUrl = getRegisterRedirectUrl();

    const { data, error } = await authSupabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName
        }
      }
    });

    if (error) {
      throw new Error(error.message || "Registrierung fehlgeschlagen.");
    }

    registerPassword.value = "";
    registerPasswordConfirm.value = "";

    if (data.session) {
      authSetMessage(
        registerMessage,
        "Konto wurde erstellt und du bist angemeldet. Du wirst weitergeleitet...",
        "success"
      );

      authShowSession(data.session);

      window.setTimeout(() => {
        window.location.href = getAuthRedirectTarget();
      }, 900);

      return;
    }

    authSetMessage(
      registerMessage,
      "Konto wurde erstellt. Bitte bestätige deine E-Mail-Adresse und logge dich danach ein.",
      "success"
    );

    window.setTimeout(() => {
      authOpenTab("login");

      if (loginEmail) {
        loginEmail.value = email;
      }

      authSetMessage(
        loginMessage,
        "Bitte bestätige zuerst deine E-Mail-Adresse. Danach kannst du dich einloggen.",
        "success"
      );
    }, 1400);
  } catch (error) {
    authSetMessage(registerMessage, error.message || "Registrierung fehlgeschlagen.", "error");
  } finally {
    authSetButtonLoading(registerButton, false, "Konto wird erstellt...", "Konto erstellen");
  }
}

async function authHandleLogout() {
  try {
    await authSupabaseClient.auth.signOut();
  } catch (_error) {
    // Logout soll für den Nutzer trotzdem abgeschlossen wirken.
  }

  authShowForms();
}

async function authCheckCurrentSession() {
  const { data, error } = await authSupabaseClient.auth.getSession();

  if (error) {
    authShowForms();
    return;
  }

  if (data.session) {
    authShowSession(data.session);

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      window.setTimeout(() => {
        window.location.href = getAuthRedirectTarget();
      }, 500);
    }

    return;
  }

  authShowForms();
}

function authSetupEvents() {
  authTabs.forEach((button) => {
    button.addEventListener("click", () => {
      authOpenTab(button.dataset.authTab || "login");
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", authHandleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", authHandleRegister);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", authHandleLogout);
  }
}

async function initAuth() {
  try {
    authSetupEvents();
    await authSetupSupabase();
    await authCheckCurrentSession();
  } catch (error) {
    authSetMessage(loginMessage, error.message || "Auth konnte nicht geladen werden.", "error");
    authSetMessage(registerMessage, error.message || "Auth konnte nicht geladen werden.", "error");
  }
}

initAuth();
