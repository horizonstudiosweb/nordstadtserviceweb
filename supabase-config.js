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
  Die Sicherheit kommt über Supabase RLS-Policies, Rollenprüfung
  und serverseitige Edge Functions.
*/

const SUPABASE_CONFIG = {
  enabled: true,

  url: "https://nhasjzrtvxmlrwwoqnrk.supabase.co",

  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYXNqenJ0dnhtbHJ3d29xbnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTY2NTgsImV4cCI6MjA5ODEzMjY1OH0.SGRA0aVeiLVGu-xYxCZvHXcFXtqNEMZGwiICaN1Z-F0",

  functions: {
    createTicket: "create-support-ticket"
  },

  storage: {
    ticketUploadsBucket: "ticket-uploads"
  },

  pages: {
    home: "index.html",
    supportCenter: "support-center.html",
    admin: "admin.html",
    auth: "auth.html"
  }
};

function getSupabaseConfig() {
  return {
    enabled: SUPABASE_CONFIG.enabled,
    url: SUPABASE_CONFIG.url,
    anonKey: SUPABASE_CONFIG.anonKey,
    functions: { ...SUPABASE_CONFIG.functions },
    storage: { ...SUPABASE_CONFIG.storage },
    pages: { ...SUPABASE_CONFIG.pages }
  };
}

window.NordstadtSupabaseConfig = {
  getConfig: getSupabaseConfig
};
