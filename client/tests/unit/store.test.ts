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
  senderTrack = { stop: vi.fn() };
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;

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
    return [{ track: this.senderTrack } as unknown as RTCRtpSender];
  }

  close(): void {}
}

describe("realtime store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-1" });
  });

  it("handles missing token value", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({}),
      })),
    );

    const store = useRealtimeStore();
    await store.startSession();
    expect(store.errorMessage).toContain("Token response does not include value");
    expect(store.isSessionActive).toBe(false);
  });

  it("handles media permission failure", async () => {
    const peer = new MockPeerConnection();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/token") {
          return {
            ok: true,
            json: async () => ({ value: "epk_123" }),
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
          getUserMedia: vi.fn(async () => {
            throw new Error("Permission denied");
          }),
        },
      },
      configurable: true,
    });

    const store = useRealtimeStore();
    await store.startSession();

    expect(store.errorMessage).toContain("Permission denied");
    expect(store.peerConnection).toBeNull();
    expect(store.dataChannel).toBeNull();
  });

  it("starts session and receives events", async () => {
    const peer = new MockPeerConnection();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/token") {
          return {
            ok: true,
            json: async () => ({ value: "epk_123" }),
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
    expect(store.isSessionActive).toBe(true);

    peer.channel.emit("message", { data: JSON.stringify({ type: "session.created", event_id: "event_1" }) });
    expect(store.events.length).toBeGreaterThan(0);
  });

  it("sendClientEvent enriches event and sends payload", () => {
    const store = useRealtimeStore();
    const dc = new MockDataChannel();
    store.dataChannel = dc as unknown as RTCDataChannel;

    store.sendClientEvent({ type: "response.create" });

    expect(dc.sent.length).toBe(1);
    expect(store.events[0].event_id).toBe("uuid-1");
    expect(store.events[0].timestamp).toBeTruthy();
  });

  it("stopSession is safe when already closed", () => {
    const store = useRealtimeStore();
    expect(() => store.stopSession()).not.toThrow();
  });

  it("ignores response.done without output", () => {
    const store = useRealtimeStore();
    store.appendEvent({ type: "response.done", response: {} });
    expect(store.functionCallOutput).toBeNull();
  });

  it("handles invalid function arguments JSON", () => {
    const store = useRealtimeStore();
    store.functionCallOutput = {
      type: "function_call",
      name: "display_color_palette",
      arguments: "{bad json",
    };

    expect(store.parsedFunctionCallArguments).toBeNull();
  });
});
