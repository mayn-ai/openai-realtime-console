# Model Usage

## Zweck
`REALTIME_MODEL` steuert, welches Realtime-Modell in dieser App verwendet wird.

## Konfiguration
Setze den Wert in `.env`:

```bash
REALTIME_MODEL="gpt-realtime-mini"
```

Die Vorlage steht in `.env.example`.

## Datenfluss
1. Server liest `REALTIME_MODEL` beim Start.
2. `GET /config` liefert `{ realtimeModel }` an den Client.
3. `GET /token` erzeugt den ephemeren Client-Token mit derselben Session-Konfiguration.
4. Client startet den WebRTC-Realtime-Call mit `?model=<realtimeModel>`.

## Warum sendet der Client trotzdem das Model?
Beim WebRTC-Flow läuft der finale REST-Handshake (`/v1/realtime/calls`) direkt im Browser mit dem ephemeren Token. Deshalb enthält der Browser-Call technisch den `model`-Parameter.

Die fachliche Entscheidung bleibt trotzdem auf dem Server, weil der Client den Wert nicht lokal festlegt, sondern nur über `GET /config` übernimmt.

## Auswirkungen bei Modellwechsel
Ein Wechsel von `REALTIME_MODEL` kann verändern:
1. Antwortqualität und Verhalten (Reasoning, Stil, Tool-Nutzung)
2. Latenz (Zeit bis erste/finale Antwort)
3. Kosten bzw. Tokenverbrauch
4. Audio-/Transcript-Eventverhalten (z. B. Frequenz von Deltas)

## Rollout-Checkliste
1. Modell zuerst in Staging testen.
2. `npm run typecheck` und `npm run test:run` ausführen.
3. Manuell prüfen, dass `GET /config` den erwarteten Wert liefert.
4. Im Browser-Netzwerk prüfen, dass `realtime/calls?model=...` exakt diesen Wert nutzt.
5. Logs/UX auf Latenz und Transcript-Verhalten beobachten.
