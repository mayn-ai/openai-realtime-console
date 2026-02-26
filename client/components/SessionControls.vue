<template>
  <div class="flex gap-4 border-t-2 border-gray-200 h-full rounded-md">
    <div v-if="store.isSessionActive" class="flex items-center justify-center w-full h-full gap-4">
      <input
        v-model="message"
        @keydown="onKeyDown"
        type="text"
        placeholder="send a text message..."
        class="border border-gray-200 rounded-full p-4 flex-1"
      />
      <Button class-name="bg-blue-400" @click="onSendText">
        send text
      </Button>
      <Button @click="store.stopSession">disconnect</Button>
    </div>

    <div v-else class="flex items-center justify-center w-full h-full">
      <Button
        :class-name="store.isActivating ? 'bg-gray-600' : 'bg-red-600'"
        @click="store.startSession"
      >
        {{ store.isActivating ? "starting session..." : "start session" }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRealtimeStore } from "../stores/realtime";
import Button from "./Button.vue";

const store = useRealtimeStore();
const message = ref("");

function onSendText(): void {
  const text = message.value;
  if (!text.trim()) return;
  store.sendTextMessage(text);
  message.value = "";
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    onSendText();
  }
}
</script>
