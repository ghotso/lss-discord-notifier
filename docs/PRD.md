````markdown
# 📄 Product Requirements Document (PRD)  
## LSS Webhook Notifier

---

## 🎯 Zielsetzung
Ein browserbasiertes Tool (Tampermonkey-Skript), das Ereignisse aus dem Leitstellenspiel erkennt und konfigurierbar per Discord Webhook meldet. Die Einstellungen werden zentral in Supabase gespeichert und automatisch über die `user_id` synchronisiert. Der Discord Webhook wird clientseitig verschlüsselt und bleibt somit geschützt.

---

## 🧩 Funktionen

### 🔔 Ereigniserkennung im Spiel (Trigger)

| Kategorie                      | Beschreibung                                                                 |
|-------------------------------|------------------------------------------------------------------------------|
| Neue Einsätze                 | Neue Einsatzkarte erscheint                                                  |
| Sprechwünsche                 | Fahrzeug fordert manuelle Anweisung an                                       |
| Unvollständige Einsätze       | Einsatz wird begonnen, aber Fahrzeuge fehlen noch und keine weiteren Fahrzeuge auf Anfahrt - Auch Fahrzeug Anforderungen bei Patienten beachten!                            |
| Patient benötigt Sondermittel | NEF, RTH, LNA, OrgL oder SEG z.b.erforderlich                                               |
| Einsatz verändert             | Weitere Fahrzeuge gefordert oder Bedingungen ändern sich                     |
| Verbandsgroßeinsätze              | Großeinsätze mit Verbandsbeteiligung                                            |
| Krankentransporte             | (optional ausblendbar über Einstellung)                                      |

---

### 📬 Discord-Benachrichtigungen

- Webhook wird vom Benutzer einmal eingegeben
- Nachrichten enthalten:
  - Einsatzbezeichnung
  - Adresse (sofern verfügbar)
  - Einsatzlink
  - Einbettung mit **Farbe**, **Benutzernamen** und **Avatar**
- Pro Kategorie konfigurierbar

---

### ⚙️ Konfiguration & UI

- UI über Button im Spiel-Interface
- Pro Kategorie einstellbar:
  - Aktiv / Inaktiv
  - Farbe der Nachricht (Hex)
  - Anzeigename (z. B. "EinsatzBot")
  - Avatar-Bild
- Globale Optionen:
  - Webhook-URL + Testversand
  - „Krankentransporte ausschließen“

---

## 🛠️ Technische Details

### 🧮 Supabase-Datenbankstruktur

**Tabelle:** `settings`

| Spalte         | Typ       | Beschreibung                                  |
|----------------|-----------|-----------------------------------------------|
| `id`           | uuid      | Primärschlüssel                               |
| `user_token`   | text      | z. B. `user-12345`                            |
| `config_json`  | jsonb     | Einstellungen ohne Webhook                    |
| `webhook_enc`  | text      | Base64-kodierter verschlüsselter Webhook      |
| `webhook_iv`   | text      | Initialisierungsvektor (Base64), pro User     |
| `updated_at`   | timestamp | Automatisch gesetzt                           |

#### 🔐 Row-Level Security (RLS)
```sql
CREATE POLICY "user can read own settings"
ON settings
FOR SELECT
USING (user_token = current_setting('request.jwt.claims.user_token', true));

CREATE POLICY "user can update own settings"
ON settings
FOR UPDATE
USING (user_token = current_setting('request.jwt.claims.user_token', true));
````

---

### 🔐 Verschlüsselung des Webhooks

* AES-GCM (256-bit)
* Key deriviert aus `"lss-webhook-" + user_id` (PBKDF2)
* IV zufällig generiert, mitgespeichert
* Verschlüsselung/Entschlüsselung erfolgt **nur lokal**

---

### 🧰 Technologie-Stack

| Komponente        | Technologie                      |
| ----------------- | -------------------------------- |
| Skriptumgebung    | Tampermonkey (JavaScript)        |
| Backend-Storage   | Supabase (PostgreSQL)            |
| Authentifizierung | `user_id` aus Spiel              |
| Crypto            | Web Crypto API (`crypto.subtle`) |
| Webhook-Output    | Discord Webhook API              |

---

## 🔐 Datenschutz & Sicherheit

* Webhook wird **nicht unverschlüsselt** gespeichert
* Alle Daten nur nutzerbezogen durch Token (`user_id`)
* Keine Drittanmeldung oder externe Dienste
* Optional: „Lokaler Modus“ = keine Cloud-Speicherung

---

## 🚀 Veröffentlichung

* **Format:** Tampermonkey-UserScript 
* Bereitgestellt via GitHub Repository
* Dokumentation im ReadMe mit Platz für Screenshots:

  * Installation
  * Webhook-Setup
  * Beispiel-Konfigurationen


---

## 📎 Notizen

* Benutzer müssen sich nicht registrieren
* Einstellungen synchronisieren automatisch auf Basis der `user_id`

