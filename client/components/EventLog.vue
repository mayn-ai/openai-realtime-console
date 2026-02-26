<template>
  <div class="flex flex-col gap-2 overflow-x-auto">
    <div v-if="displayEvents.length === 0" class="text-gray-500">Awaiting events...</div>
    <div
      v-for="(event, index) in displayEvents"
      :key="event.event_id ?? `${event.type}-${index}`"
      class="flex flex-col gap-2 p-2 rounded-md bg-gray-50"
    >
      <div class="flex items-center gap-2 cursor-pointer" @click="toggleExpanded(index)">
        <div :class="event.isClient ? 'text-blue-500' : 'text-green-500'">
          {{ event.isClient ? 'down' : 'up' }}
        </div>
        <div class="text-sm text-gray-500">
          {{ event.isClient ? "client:" : "server:" }} {{ event.type }} | {{ event.timestamp }}
        </div>
      </div>
      <div
        :class="[
          'text-gray-500 bg-gray-200 p-2 rounded-md overflow-x-auto',
          expanded[index] ? 'block' : 'hidden',
        ]"
      >
        <pre class="text-xs">{{ JSON.stringify(event, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRealtimeStore } from "../stores/realtime";
import type { RealtimeEvent } from "../types/realtime";

interface DisplayEvent extends RealtimeEvent {
  isClient: boolean;
}

const store = useRealtimeStore();
const expanded = ref<Record<number, boolean>>({});

const displayEvents = computed<DisplayEvent[]>(() => {
  const output: DisplayEvent[] = [];
  const deltaEvents: Record<string, boolean> = {};

  for (const event of store.events) {
    if (event.type.endsWith("delta")) {
      if (deltaEvents[event.type]) {
        continue;
      }
      deltaEvents[event.type] = true;
    }

    output.push({
      ...event,
      isClient: Boolean(event.event_id && !event.event_id.startsWith("event_")),
    });
  }

  return output;
});

function toggleExpanded(index: number): void {
  expanded.value[index] = !expanded.value[index];
}
</script>
