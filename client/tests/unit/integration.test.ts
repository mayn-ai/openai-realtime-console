import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useRealtimeStore } from "../../stores/realtime";

class MockDataChannel {
  sent: string[] = [];
  listeners: Record<string, Array<(value: any) => void>> = {};

  addEventListener(type: string, cb: (value: any) => void): void {
    this.listeners[type] = this.listeners[type] ?? [];
    this.listeners[type].push(cb);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {}

  emit(type: string, value: any): void {
    for (const listener of this.listeners[type] ?? []) {
      listener(value);
    }
  }
}

class MockPeerConnection {
  channel = new MockDataChannel();

  createDataChannel(): RTCDataChannel {
    return this.channel as unknown as RTCDataChannel;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: "offer-sdp" };
  }

  async setLocalDescription(): Promise<void> {}

  async setRemoteDescription(): Promise<void> {}

  addTrack(): void {}

  getSenders(): RTCRtpSender[] {
    return [];
  }

  close(): void {}
}

describe("integration flow", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-2" });
  });

  it("start -> receive event -> send text -> stop", async () => {
    const peer = new MockPeerConnection();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/config") {
          return {
            ok: true,
            json: async () => ({ realtimeModel: "gpt-realtime-mini" }),
          };
        }
        if (input === "/token") {
          return {
            ok: true,
            json: async () => ({ value: "epk_abc" }),
          };
        }

        return {
          ok: true,
          text: async () => "answer-sdp",
        };
      }),
    );

    vi.stubGlobal("RTCPeerConnection", vi.fn(() => peer));
    Object.defineProperty(globalThis, "navigator", {
      value: {
        mediaDevices: {
          getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })),
        },
      },
      configurable: true,
    });

    const store = useRealtimeStore();
    await store.startSession();
    peer.channel.emit("open", {});

    peer.channel.emit("message", {
      data: JSON.stringify({ type: "session.created", event_id: "event_100" }),
    });

    store.sendTextMessage("hi there");

    expect(peer.channel.sent.length).toBeGreaterThan(1);
    expect(store.events.length).toBeGreaterThan(0);

    store.stopSession();
    expect(store.isSessionActive).toBe(false);
  });
});
