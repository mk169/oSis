/* ===========================================================
   OS — Zugangsdaten der Kopplung

   Trägst du die beiden Werte hier ein, ist die Kopplung auf jedem
   Gerät sofort vorbereitet. Es bleibt nur die Anmeldung mit deiner
   E-Mail-Adresse. Bleiben sie leer, läuft OS rein lokal, und die
   Kopplung lässt sich bei Bedarf unter Review & System, Daten,
   Geräte von Hand einrichten.

   Beide Werte stehen in deinem Supabase-Projekt unter
   Settings, API:

     supabaseUrl  →  Project URL,  etwa https://abcdefgh.supabase.co
     supabaseKey  →  anon public,  ein langer Text, der mit eyJ beginnt

   Der anon-public-Schlüssel ist zur Veröffentlichung gemacht und darf
   in dieser Datei stehen, auch in einem öffentlichen Repository.
   Geschützt werden die Daten nicht durch ihn, sondern durch die
   Zugriffsregeln der Datenbank: Jede Person sieht nur die eigene Zeile.
   Der geheime service_role-Schlüssel gehört niemals hierher.
   =========================================================== */

window.OS = window.OS || {};

OS.config = {
  supabaseUrl: 'https://sqfckutbwrgbhhklckda.supabase.co',
  supabaseKey: ''
};
