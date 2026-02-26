import { defineStore } from "pinia";
import type {
  ChatMessage,
  ChatRole,
  ConfigResponse,
  ParsedToolArguments,
  RealtimeEvent,
  SessionState,
  TokenResponse,
  TranscriptCandidate,
  ToolCallOutput,
} from "../types/realtime";

const functionDescription = "Call this function when a user asks for a color palette.";

const sessionUpdate: RealtimeEvent = {
  type: "session.update",
  session: {
    type: "realtime",
    audio: {
      input: {
        transcription: {
          model: "gpt-4o-mini-transcribe",
        },
      },
    },
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Description of the theme for the color scheme.",
            },
            colors: {
              type: "array",
              description: "Array of five hex color codes based on the theme.",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function nowTime(): string {
  return new Date().toLocaleTimeString();
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function eventRole(eventType: string): ChatRole {
  if (eventType.startsWith("response.")) return "assistant";
  return "unknown";
}

function getEventItemId(event: RealtimeEvent): string | null {
  const directItemId = asString(event.item_id);
  if (directItemId) return directItemId;

  const item = asObject(event.item);
  const nestedItemId = asString(item?.id);
  if (nestedItemId) return nestedItemId;

  return null;
}

function contentTranscript(content: unknown): string | null {
  for (const part of asArray(content)) {
    const objectPart = asObject(part);
    const transcript = asString(objectPart?.transcript);
    if (transcript) return transcript;
  }
  return null;
}

export function extractTranscriptCandidates(events: RealtimeEvent[]): TranscriptCandidate[] {
  const candidates: TranscriptCandidate[] = [];

  for (const event of [...events].reverse()) {
    const type = event.type;
    const timestamp = asString(event.timestamp) ?? undefined;

    if (type === "response.output_audio_transcript.done") {
      const itemId = asString(event.item_id);
      const transcript = asString(event.transcript);
      if (itemId && transcript) {
        candidates.push({
          itemId,
          role: "assistant",
          text: transcript,
          sourceType: type,
          timestamp,
          isFinal: true,
          priority: 5,
        });
      }
      continue;
    }

    if (type === "response.content_part.done") {
      const itemId = asString(event.item_id);
      const part = asObject(event.part);
      const partType = asString(part?.type);
      const transcript = asString(part?.transcript);
      if (itemId && partType === "audio" && transcript) {
        candidates.push({
          itemId,
          role: "assistant",
          text: transcript,
          sourceType: type,
          timestamp,
          isFinal: true,
          priority: 4,
        });
      }
      continue;
    }

    if (type === "response.output_item.done") {
      const item = asObject(event.item);
      const itemId = asString(item?.id);
      const transcript = contentTranscript(item?.content);
      const role = (asString(item?.role) as ChatRole | null) ?? "assistant";
      if (itemId && transcript) {
        candidates.push({
          itemId,
          role,
          text: transcript,
          sourceType: type,
          timestamp,
          isFinal: true,
          priority: 3,
        });
      }
      continue;
    }

    if (type === "conversation.item.done") {
      const item = asObject(event.item);
      const itemId = asString(item?.id);
      const transcript = contentTranscript(item?.content);
      const role = (asString(item?.role) as ChatRole | null) ?? "unknown";
      if (itemId && transcript) {
        candidates.push({
          itemId,
          role,
          text: transcript,
          sourceType: type,
          timestamp,
          isFinal: true,
          priority: 2,
        });
      }
      continue;
    }

    if (
      type === "conversation.item.input_audio_transcription.completed" ||
      type === "input_audio_transcription.completed"
    ) {
      const itemId = getEventItemId(event);
      const transcript = asString(event.transcript);
      if (itemId && transcript) {
        candidates.push({
          itemId,
          role: "user",
          text: transcript,
          sourceType: type,
          timestamp,
          isFinal: true,
          priority: 6,
        });
      }
      continue;
    }

    if (
      type === "conversation.item.input_audio_transcription.delta" ||
      type === "input_audio_transcription.delta"
    ) {
      const itemId = getEventItemId(event);
      const delta = asString(event.delta);
      if (itemId && delta) {
        candidates.push({
          itemId,
          role: "user",
          text: delta,
          sourceType: type,
          timestamp,
          isFinal: false,
          priority: 5,
        });
      }
      continue;
    }

    if (type === "response.done") {
      const response = asObject(event.response);
      const outputs = asArray(response?.output);
      for (const output of outputs) {
        const item = asObject(output);
        const itemId = asString(item?.id);
        const transcript = contentTranscript(item?.content);
        const role = (asString(item?.role) as ChatRole | null) ?? eventRole(type);
        if (itemId && transcript) {
          candidates.push({
            itemId,
            role,
            text: transcript,
            sourceType: type,
            timestamp,
            isFinal: true,
            priority: 1,
          });
        }
      }
    }
  }

  return candidates;
}

export function extractPendingUserCandidates(events: RealtimeEvent[]): TranscriptCandidate[] {
  const candidates: TranscriptCandidate[] = [];
  let pendingCounter = 0;

  for (const event of [...events].reverse()) {
    const type = event.type;
    const timestamp = asString(event.timestamp) ?? undefined;

    if (type === "input_audio_buffer.speech_started") {
      const itemId = getEventItemId(event) ?? `pending-user-${pendingCounter++}`;
      candidates.push({
        itemId,
        role: "user",
        text: "Transkribiere...",
        sourceType: type,
        timestamp,
        isFinal: false,
        priority: 0,
      });
      continue;
    }

    if (type === "conversation.item.created") {
      const item = asObject(event.item);
      const role = asString(item?.role);
      const itemId = asString(item?.id);
      const content = asArray(item?.content);
      const containsInputAudio = content.some((part) => {
        const objectPart = asObject(part);
        return asString(objectPart?.type) === "input_audio";
      });

      if (role === "user" && itemId && containsInputAudio && !contentTranscript(content)) {
        candidates.push({
          itemId,
          role: "user",
          text: "Transkribiere...",
          sourceType: type,
          timestamp,
          isFinal: false,
          priority: 0,
        });
      }
    }
  }

  return candidates;
}

export const useRealtimeStore = defineStore("realtime", {
  state: (): SessionState => ({
    isSessionActive: false,
    isActivating: false,
    events: [],
    dataChannel: null,
    peerConnection: null,
    functionAdded: false,
    functionCallOutput: null,
    errorMessage: null,
  }),

  getters: {
    parsedFunctionCallArguments(state): ParsedToolArguments | null {
      if (!state.functionCallOutput) return null;
      try {
        const parsed = JSON.parse(state.functionCallOutput.arguments) as ParsedToolArguments;
        if (!parsed || typeof parsed.theme !== "string" || !Array.isArray(parsed.colors)) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    },

    chatMessagesFromEvents(state): ChatMessage[] {
      const byItemId = new Map<string, ChatMessage & { priority: number }>();
      const order: string[] = [];

      for (const candidate of extractTranscriptCandidates(state.events)) {
        const existing = byItemId.get(candidate.itemId);
        if (!existing) {
          byItemId.set(candidate.itemId, {
            id: candidate.itemId,
            role: candidate.role,
            text: candidate.text,
            createdAt: candidate.timestamp,
            updatedAt: candidate.timestamp,
            status: candidate.isFinal ? "final" : "streaming",
            sourceType: candidate.sourceType,
            isPlaceholder: !candidate.isFinal,
            priority: candidate.priority,
          });
          order.push(candidate.itemId);
          continue;
        }

        const shouldReplace =
          candidate.priority > existing.priority || candidate.priority === existing.priority;

        if (shouldReplace) {
          existing.role = candidate.role;
          existing.text = candidate.text;
          existing.updatedAt = candidate.timestamp ?? existing.updatedAt;
          existing.status = candidate.isFinal ? "final" : existing.status;
          existing.sourceType = candidate.sourceType;
          existing.isPlaceholder = !candidate.isFinal;
          existing.priority = candidate.priority;
        }
      }

      for (const pending of extractPendingUserCandidates(state.events)) {
        const existing = byItemId.get(pending.itemId);
        if (existing) {
          // Keep final transcript if already resolved for this item.
          if (existing.status === "final") continue;
          existing.text = "Transkribiere...";
          existing.role = "user";
          existing.status = "pending";
          existing.sourceType = pending.sourceType;
          existing.isPlaceholder = true;
          existing.updatedAt = pending.timestamp ?? existing.updatedAt;
          continue;
        }

        byItemId.set(pending.itemId, {
          id: pending.itemId,
          role: "user",
          text: "Transkribiere...",
          createdAt: pending.timestamp,
          updatedAt: pending.timestamp,
          status: "pending",
          sourceType: pending.sourceType,
          isPlaceholder: true,
          priority: 0,
        });
        order.push(pending.itemId);
      }

      return order
        .map((id) => byItemId.get(id))
        .filter((message): message is ChatMessage & { priority: number } => Boolean(message))
        .map(({ priority: _priority, ...message }) => message);
    },
  },

  actions: {
    appendEvent(event: RealtimeEvent): void {
      if (!event.timestamp) {
        event.timestamp = nowTime();
      }
      this.events = [event, ...this.events];
      this.handleToolEvents();
    },

    handleToolEvents(): void {
      if (this.events.length === 0) return;

      const oldestEvent = this.events[this.events.length - 1];
      if (!this.functionAdded && oldestEvent.type === "session.created") {
        this.functionAdded = true;
        this.sendClientEvent(sessionUpdate);
      }

      const mostRecentEvent = this.events[0];
      const response = asObject(mostRecentEvent.response);
      const outputs = response?.output;
      if (mostRecentEvent.type !== "response.done" || !Array.isArray(outputs)) {
        return;
      }

      for (const item of outputs) {
        const toolCall = asObject(item);
        if (
          toolCall?.type === "function_call" &&
          toolCall.name === "display_color_palette" &&
          typeof toolCall.arguments === "string"
        ) {
          this.functionCallOutput = toolCall as ToolCallOutput;
          setTimeout(() => {
            this.sendClientEvent({
              type: "response.create",
              response: {
                instructions:
                  "ask for feedback about the color palette - do not repeat the colors, just ask if they like the colors.",
              },
            });
          }, 500);
        }
      }
    },

    sendClientEvent(message: RealtimeEvent): void {
      if (!this.dataChannel) {
        this.errorMessage = "Failed to send message - no data channel available";
        return;
      }

      if (!message.event_id) {
        message.event_id = crypto.randomUUID();
      }

      this.dataChannel.send(JSON.stringify(message));
      this.appendEvent({ ...message });
    },

    sendTextMessage(text: string): void {
      const trimmed = text.trim();
      if (!trimmed) return;

      this.sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: trimmed,
            },
          ],
        },
      });

      this.sendClientEvent({ type: "response.create" });
    },

    attachDataChannelListeners(dc: RTCDataChannel): void {
      dc.addEventListener("message", (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeEvent;
          this.appendEvent(parsed);
        } catch {
          this.appendEvent({
            type: "client.parse_error",
            message: "Failed to parse server event payload",
          });
        }
      });

      dc.addEventListener("open", () => {
        this.isSessionActive = true;
        this.errorMessage = null;
        this.events = [];
      });
    },

    cleanupConnection(): void {
      if (this.dataChannel) {
        this.dataChannel.close();
      }

      if (this.peerConnection) {
        for (const sender of this.peerConnection.getSenders()) {
          if (sender.track) {
            sender.track.stop();
          }
        }
        this.peerConnection.close();
      }

      this.dataChannel = null;
      this.peerConnection = null;
      this.isSessionActive = false;
      this.isActivating = false;
    },

    resetToolState(): void {
      this.functionAdded = false;
      this.functionCallOutput = null;
    },

    stopSession(): void {
      this.cleanupConnection();
      this.resetToolState();
    },

    async startSession(): Promise<void> {
      if (this.isActivating || this.isSessionActive) return;
      this.isActivating = true;
      this.errorMessage = null;

      try {
        const configResponse = await fetch("/config");
        if (!configResponse.ok) {
          throw new Error("Config request failed");
        }

        const configData = (await configResponse.json()) as ConfigResponse;
        const realtimeModel = asString(configData.realtimeModel);
        if (!realtimeModel) {
          throw new Error("Config response does not include realtimeModel");
        }

        const tokenResponse = await fetch("/token");
        if (!tokenResponse.ok) {
          throw new Error("Token request failed");
        }

        const data = (await tokenResponse.json()) as TokenResponse;
        const ephemeralKey = data.value;
        if (!ephemeralKey) {
          throw new Error("Token response does not include value");
        }

        const pc = new RTCPeerConnection();
        const audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        pc.ontrack = (event) => {
          audioElement.srcObject = event.streams[0];
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        pc.addTrack(mediaStream.getTracks()[0]);

        const dc = pc.createDataChannel("oai-events");
        this.dataChannel = dc;
        this.attachDataChannelListeners(dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const response = await fetch(
          `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(realtimeModel)}`,
          {
            method: "POST",
            body: offer.sdp ?? "",
            headers: {
              Authorization: `Bearer ${ephemeralKey}`,
              "Content-Type": "application/sdp",
            },
          },
        );

        if (!response.ok) {
          throw new Error("SDP exchange failed");
        }

        const sdp = await response.text();
        await pc.setRemoteDescription({ type: "answer", sdp });
        this.peerConnection = pc;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "Failed to start session";
        this.cleanupConnection();
      } finally {
        this.isActivating = false;
      }
    },
  },
});
