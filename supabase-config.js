/*
  Nordstadt Roleplay - Supabase Config

  Diese Datei ist nur für öffentliche Supabase-Verbindungsdaten gedacht.

  ERLAUBT:
  - Supabase Project URL
  - Supabase anon public key

  NICHT ERLAUBT:
  - Discord Webhook
  - Supabase service_role key
  - Admin-Passwörter
  - geheime Tokens
  - private Keys
  - Manager-Codes

  Wichtig:
  Der anon public key darf im Frontend sichtbar sein.
  Die Sicherheit kommt später über Supabase RLS-Policies.
*/

const SUPABASE_CONFIG = {
  enabled: false,

  /*
    Später hier eintragen:

    url:
    Supabase Dashboard
    → Project Settings
    → Data API
    → Project URL

    anonKey:
    Supabase Dashboard
    → Project Settings
    → Data API
    → anon public key
  */

  url: "DEINE_SUPABASE_PROJECT_URL_HIER",
  anonKey: "DEIN_SUPABASE_ANON_PUBLIC_KEY_HIER"
};

function getSupabaseConfig() {
  return SUPABASE_CONFIG;
}

window.NordstadtSupabaseConfig = {
  getConfig: getSupabaseConfig
};
