<template>
  <section class="h-full w-full flex flex-col gap-2 bg-white/70 rounded-md p-3 border border-gray-200">
    <h2 class="text-sm font-bold text-gray-700">Chat Transcript</h2>

    <div v-if="messages.length === 0" class="text-gray-500 text-sm">No transcript messages yet...</div>

    <div v-for="message in messages" :key="message.id" class="rounded-md border border-gray-200 p-3 bg-gray-50">
      <div class="flex items-center justify-between mb-1 text-xs text-gray-500">
        <span>{{ message.role }}</span>
        <span>{{ message.updatedAt ?? "-" }}</span>
      </div>
      <p class="text-sm text-gray-800 whitespace-pre-wrap">{{ message.text }}</p>
      <div class="mt-1 text-xs text-gray-500">{{ message.status }} via {{ message.sourceType }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRealtimeStore } from "../stores/realtime";

const store = useRealtimeStore();
const messages = computed(() => store.chatMessagesFromEvents);
</script>
