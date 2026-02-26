# Realtime Response Lifecycle (mit Transcript-Events)

## Ziel und Kontext
Diese Doku beschreibt den Live-Cycle der Realtime-Responses in diesem Projekt anhand der Beispiele unter `/docs/response-examples`.

Wichtig: Dasselbe Transcript kann in mehreren Event-Typen auftauchen. Das ist erwartetes Verhalten, weil das Protokoll mehrere Ebenen (Content, Item, Conversation, Response) parallel bestätigt.

[mehr](https://platform.openai.com/docs/api-reference/realtime-server-events)

## Beispielquellen
- `docs/response-examples/example1.json`
- `docs/response-examples/example2.json`
- `docs/response-examples/example3.json`
- `docs/response-examples/example4.json`
- `docs/response-examples/example5.json`
- `docs/response-examples/example6.json`
- `docs/response-examples/example7.json`

## Beobachtete Reihenfolge im Lifecycle
Typisch vom spezifischen Content-Level zum aggregierten Response-Level:
1. `response.output_audio_transcript.done`
2. `response.content_part.done`
3. `response.output_item.done`
4. `conversation.item.done`
5. `response.done`

Zusätzlich können unabhängige technische Events auftauchen (z. B. `rate_limits.updated`).

## Transcript-Events im Vergleich
| Beispiel | Event-Typ | Transcript-Pfad | Granularität | Für Chat geeignet |
|---|---|---|---|---|
| `example1.json` | `response.output_audio_transcript.done` | `transcript` | Sehr spezifisch (Audio-Transcript fertig) | Ja |
| `example2.json` | `response.content_part.done` | `part.transcript` | Content-Part abgeschlossen | Ja |
| `example3.json` | `conversation.item.done` | `item.content[].transcript` | Conversation-Item abgeschlossen | Ja |
| `example4.json` | `response.output_item.done` | `item.content[].transcript` | Output-Item abgeschlossen | Ja |
| `example5.json` | `response.done` | `response.output[].content[].transcript` | Gesamte Response abgeschlossen | Ja (als Fallback) |
| `example6.json` | *(leer)* | - | Kein Payload | Nein |
| `example7.json` | `rate_limits.updated` | - | Infrastruktur/Quota | Nein |

## Warum es mindestens 4 verschiedene Transcript-Nachrichten gibt
Das Realtime-Protokoll veröffentlicht Status auf mehreren Ebenen. Daher kann derselbe Text mehrfach vorkommen:
1. Content-Ebene (`response.output_audio_transcript.done`, `response.content_part.done`)
2. Item-Ebene (`response.output_item.done`, `conversation.item.done`)
3. Response-Ebene (`response.done`)

Die mehrfachen Events sind keine doppelten Antworten des Modells, sondern unterschiedliche Sichtweisen auf denselben Abschlusszustand.

## Empfehlung für Canonical Rendering im Chat
Für ein Chat-Div sollte dedupliziert und normalisiert gerendert werden:
1. Dedupe-Key: `item_id` (Fallback: `item.id`, danach `response.output[i].id`)
2. Priorität der Quellen:
   1. `response.output_audio_transcript.done`
   2. `response.content_part.done`
   3. `response.output_item.done`
   4. `conversation.item.done`
   5. `response.done`
3. Pro `item_id` genau eine sichtbare Chat-Nachricht.
4. `rate_limits.updated` und leere/ungültige Events ignorieren.

## User Transcript Lifecycle
Für User-Audio wird die Transkription in diesem Projekt clientseitig per `session.update` aktiviert (`input_audio_transcription`).

Erwartete User-relevante Events (abhängig von der Realtime-Version):
1. `input_audio_buffer.speech_started` -> Start der Spracheingabe, noch kein finaler Text.
2. `conversation.item.created` mit `item.role = user` und `content.type = input_audio` -> Item existiert, Transkript kann folgen.
3. `conversation.item.input_audio_transcription.completed` oder `input_audio_transcription.completed` -> finaler User-Transcript verfügbar.
4. `conversation.item.done` mit `role = user` und Transcript in `item.content[]` -> final bestätigt auf Conversation-Ebene.

Anzeige-Regel im Chat:
1. Während kein finaler Text für `item_id` vorhanden ist: Platzhalter-Bubble `Transkribiere...` (`status = pending`).
2. Sobald finaler User-Transcript eintrifft: gleiche `item_id` ersetzen und `status = final` setzen.
3. Deduplizierung bleibt `item_id`-basiert, wie bei Assistant-Nachrichten.

## Known Caveats
- `example6.json` ist leer und repräsentiert keinen nutzbaren Event.
- `rate_limits.updated` enthält keine Chat-Nachricht.
- Je nach Latenz können technisch „höhere“ Events früher/später im Log eintreffen; die Deduplizierung muss robust gegen Reihenfolge sein.
