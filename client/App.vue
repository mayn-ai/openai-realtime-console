<template>
  <nav class="absolute top-0 left-0 right-0 h-16 flex items-center">
    <div class="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
      <img style="width: 24px" src="/assets/openai-logomark.svg" alt="logo" />
      <h1>realtime console</h1>
    </div>
  </nav>

  <main class="absolute top-16 left-0 right-0 bottom-0">
    <section class="absolute top-0 left-0 right-[380px] bottom-0 flex">
      <section class="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto flex flex-col gap-4">
        <section class="min-h-[40%]">
          <ChatTranscript />
        </section>
        <section>
          <h2 class="text-sm font-bold text-gray-700 mb-2">Event Log (Debug)</h2>
          <EventLog />
        </section>
      </section>
      <section class="absolute h-32 left-0 right-0 bottom-0 p-4">
        <SessionControls />
      </section>
    </section>

    <section class="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
      <ToolPanel />
    </section>
  </main>

  <div
    v-if="store.errorMessage"
    class="absolute bottom-2 left-2 right-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2"
  >
    {{ store.errorMessage }}
  </div>
</template>

<script setup lang="ts">
import { useRealtimeStore } from "./stores/realtime";
import ChatTranscript from "./components/ChatTranscript.vue";
import EventLog from "./components/EventLog.vue";
import SessionControls from "./components/SessionControls.vue";
import ToolPanel from "./components/ToolPanel.vue";

const store = useRealtimeStore();
</script>
