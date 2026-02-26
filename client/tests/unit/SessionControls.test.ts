import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SessionControls from "../../components/SessionControls.vue";
import { useRealtimeStore } from "../../stores/realtime";

describe("SessionControls", () => {
  it("renders start button when session is inactive", () => {
    setActivePinia(createPinia());
    const wrapper = mount(SessionControls);
    expect(wrapper.text()).toContain("start session");
  });

  it("sends text on enter when active", async () => {
    setActivePinia(createPinia());
    const store = useRealtimeStore();
    store.isSessionActive = true;
    const sendSpy = vi.spyOn(store, "sendTextMessage");

    const wrapper = mount(SessionControls);
    const input = wrapper.get("input");
    await input.setValue("hello");
    await input.trigger("keydown", { key: "Enter" });

    expect(sendSpy).toHaveBeenCalledWith("hello");
  });
});
