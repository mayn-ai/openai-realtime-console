import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import EventLog from "../../components/EventLog.vue";
import { useRealtimeStore } from "../../stores/realtime";

describe("EventLog", () => {
  it("deduplicates repeated delta events", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();
    store.events = [
      { type: "response.text.delta", event_id: "a1", timestamp: "t1" },
      { type: "response.text.delta", event_id: "a2", timestamp: "t2" },
      { type: "response.done", event_id: "a3", timestamp: "t3" },
    ];

    const wrapper = mount(EventLog);
    const rows = wrapper.findAll(".cursor-pointer");
    expect(rows.length).toBe(2);
  });

  it("toggles expanded payload", async () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();
    store.events = [{ type: "response.done", event_id: "a3", timestamp: "t3" }];

    const wrapper = mount(EventLog);
    const row = wrapper.get(".cursor-pointer");
    await row.trigger("click");

    expect(wrapper.text()).toContain("response.done");
    expect(wrapper.find("pre").exists()).toBe(true);
  });
});
