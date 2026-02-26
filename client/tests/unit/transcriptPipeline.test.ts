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
});
