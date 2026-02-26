import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import { extractTranscriptCandidates, useRealtimeStore } from "../../stores/realtime";
import type { RealtimeEvent } from "../../types/realtime";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const examplesDir = path.resolve(__dirname, "../../../docs/response-examples");

function readExample(name: string): RealtimeEvent | null {
  const fullPath = path.join(examplesDir, name);
  const content = fs.readFileSync(fullPath, "utf8");
  if (!content.trim()) return null;
  return JSON.parse(content) as RealtimeEvent;
}

describe("transcript pipeline", () => {
  it("extracts candidates from example1..5 with same item id", () => {
    const events = ["example1.json", "example2.json", "example3.json", "example4.json", "example5.json"]
      .map(readExample)
      .filter((event): event is RealtimeEvent => Boolean(event));

    const candidates = extractTranscriptCandidates(events);
    expect(candidates).toHaveLength(5);
    expect(new Set(candidates.map((candidate) => candidate.itemId)).size).toBe(1);
  });

  it("deduplicates to one assistant message by item_id and picks highest priority source", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();

    store.events = ["example1.json", "example2.json", "example3.json", "example4.json", "example5.json"]
      .map(readExample)
      .filter((event): event is RealtimeEvent => Boolean(event));

    const messages = store.chatMessagesFromEvents;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].sourceType).toBe("response.output_audio_transcript.done");
    expect(messages[0].status).toBe("final");
  });

  it("ignores empty payload and non-chat events", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();

    const maybeEmpty = readExample("example6.json");
    const rateLimitEvent = readExample("example7.json");

    store.events = [maybeEmpty, rateLimitEvent].filter((event): event is RealtimeEvent => Boolean(event));

    expect(store.chatMessagesFromEvents).toHaveLength(0);
  });

  it("maps final user transcript from conversation.item.done", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();

    store.events = [
      {
        type: "conversation.item.done",
        item: {
          id: "item_user_1",
          role: "user",
          content: [{ type: "input_audio", transcript: "Ich brauche Hilfe." }],
        },
      },
    ];

    const messages = store.chatMessagesFromEvents;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].text).toBe("Ich brauche Hilfe.");
    expect(messages[0].status).toBe("final");
  });

  it("shows pending placeholder and replaces it with final transcript", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();

    store.events = [
      {
        type: "conversation.item.created",
        item: {
          id: "item_user_2",
          role: "user",
          content: [{ type: "input_audio" }],
        },
      },
    ];

    let messages = store.chatMessagesFromEvents;
    expect(messages).toHaveLength(1);
    expect(messages[0].status).toBe("pending");
    expect(messages[0].text).toBe("Transkribiere...");

    store.events = [
      {
        type: "conversation.item.done",
        item: {
          id: "item_user_2",
          role: "user",
          content: [{ type: "input_audio", transcript: "Das ist mein finaler Text." }],
        },
      },
      ...store.events,
    ];

    messages = store.chatMessagesFromEvents;
    expect(messages).toHaveLength(1);
    expect(messages[0].status).toBe("final");
    expect(messages[0].text).toBe("Das ist mein finaler Text.");
  });

  it("keeps mixed timeline stable for user and assistant", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();

    store.events = [
      {
        type: "response.output_audio_transcript.done",
        item_id: "item_assistant_1",
        transcript: "Hallo, wie kann ich helfen?",
      },
      {
        type: "conversation.item.done",
        item: {
          id: "item_user_1",
          role: "user",
          content: [{ type: "input_audio", transcript: "Bitte erkläre mir den Ablauf." }],
        },
      },
    ];

    const messages = store.chatMessagesFromEvents;
    expect(messages).toHaveLength(2);
    expect(messages.some((m) => m.role === "assistant")).toBe(true);
    expect(messages.some((m) => m.role === "user")).toBe(true);
  });
});
