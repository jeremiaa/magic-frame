# Magic Frame

Ein Dashboard für Tablets, Monitore, Wandpanels und digitale Bilderrahmen —
als Home-Assistant-Add-on, mit eigener Datenbank im Add-on. Es ist nichts
weiter zu installieren.

## Installation

1. **Einstellungen → Add-ons → Add-on-Store**
2. Oben rechts **⋮ → Repositories**, diese Adresse eintragen:
   `https://github.com/jeremiaa/magic-frame`
3. **Magic Frame** in der Liste öffnen und **Installieren** drücken.
4. **Starten**, dann **Weboberfläche öffnen**.

Beim ersten Start wird die Datenbank angelegt; das dauert einen Moment.

## Einstellungen

| Feld | Bedeutung |
|---|---|
| `admin_email` | Anmeldename des ersten Kontos. Leer lassen, um es beim ersten Aufruf im Browser anzulegen. |
| `admin_password` | Passwort dazu. Nach dem ersten Start wieder leeren — es steht sonst dauerhaft in der Add-on-Konfiguration. |
| `timezone` | Zeitzone, z. B. `Europe/Berlin`. Leer = die des Systems. |

## Home Assistant verbinden

**Es ist kein Zugriffstoken nötig.** Läuft Magic Frame als Add-on, spricht es
über den Supervisor mit Home Assistant und meldet sich selbst an. Die Felder
für URL und Token in den Einstellungen bleiben leer und werden nicht gebraucht.

## Displays

Die Ansichten sind unter `http://<ip-deiner-home-assistant>:8098/view/<id>`
erreichbar und brauchen keine Anmeldung — dafür sind sie da. Ein Wandtablet
öffnet einfach diese Adresse.

Deshalb läuft das Add-on über einen festen Port und nicht über die
Seitenleiste: Der Ingress-Pfad von Home Assistant wechselt pro Sitzung und
verlangt eine Anmeldung, ein Wandtablet hat beides nicht.

## Sicherungen

Der Supervisor hält das Add-on vor einer Sicherung an (`backup: cold`), damit
die Datenbank in einem sauberen Zustand mitgesichert wird. Eine Sicherung
enthält Ansichten, Konten und Einstellungen.

## Wenn etwas nicht läuft

- **Nach dem Neustart ausgeloggt** — sollte nicht passieren, der
  Sitzungsschlüssel liegt in `/data`. Wenn doch: Add-on-Protokoll ansehen.
- **Kalender oder Wetter leer** — die kommen aus dem Netz, nicht aus Home
  Assistant. Ein Blick ins Protokoll zeigt den Grund.
- **Seite lädt nicht** — beim ersten Start braucht das Anlegen der Datenbank
  etwas. Erst ins Protokoll schauen, bevor du neu startest.

## Was das Add-on nicht mitbringt

Der Reverse-Proxy (Caddy) aus der Docker-Compose-Version fehlt hier bewusst —
Home Assistant bringt seinen eigenen mit. Die Kachel dafür blendet sich im
Add-on-Betrieb selbst aus.
