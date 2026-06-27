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
  enabled: true,

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

  url: "https://nhasjzrtvxmlrwwoqnrk.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYXNqenJ0dnhtbHJ3d29xbnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTY2NTgsImV4cCI6MjA5ODEzMjY1OH0.SGRA0aVeiLVGu-xYxCZvHXcFXtqNEMZGwiICaN1Z-F0"
};

function getSupabaseConfig() {
  return SUPABASE_CONFIG;
}

window.NordstadtSupabaseConfig = {
  getConfig: getSupabaseConfig
};
