import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ToolPanel from "../../components/ToolPanel.vue";
import { useRealtimeStore } from "../../stores/realtime";

describe("ToolPanel", () => {
  it("shows inactive hint", () => {
    setActivePinia(createPinia());
    const wrapper = mount(ToolPanel);
    expect(wrapper.text()).toContain("Start the session to use this tool");
  });

  it("shows invalid json warning", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();
    store.isSessionActive = true;
    store.functionCallOutput = {
      type: "function_call",
      name: "display_color_palette",
      arguments: "{bad json",
    };

    const wrapper = mount(ToolPanel);
    expect(wrapper.text()).toContain("invalid JSON arguments");
  });

  it("renders parsed palette output", () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();
    store.isSessionActive = true;
    store.functionCallOutput = {
      type: "function_call",
      name: "display_color_palette",
      arguments: JSON.stringify({
        theme: "Ocean",
        colors: ["#001122", "#112233", "#223344", "#334455", "#445566"],
      }),
    };

    const wrapper = mount(ToolPanel);
    expect(wrapper.text()).toContain("Theme: Ocean");
    expect(wrapper.text()).toContain("#001122");
  });
});
