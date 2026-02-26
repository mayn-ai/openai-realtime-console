import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import ChatTranscript from "../../components/ChatTranscript.vue";
import { useRealtimeStore } from "../../stores/realtime";

describe("ChatTranscript", () => {
  it("shows normalized transcript messages", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();

    store.events = [
      {
        type: "response.output_audio_transcript.done",
        item_id: "item_1",
        transcript: "Hallo Welt",
        timestamp: "12:00:00",
      },
      {
        type: "response.done",
        response: {
          output: [
            {
              id: "item_1",
              role: "assistant",
              content: [{ type: "output_audio", transcript: "Hallo Welt" }],
            },
          ],
        },
      },
    ];

    const wrapper = mount(ChatTranscript);
    expect(wrapper.text()).toContain("Hallo Welt");
    expect(wrapper.text()).toContain("assistant");
    expect(wrapper.text()).toContain("response.output_audio_transcript.done");
  });
});
