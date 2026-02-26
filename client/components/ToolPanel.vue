<template>
  <section class="h-full w-full flex flex-col gap-4">
    <div class="h-full bg-gray-50 rounded-md p-4">
      <h2 class="text-lg font-bold">Color Palette Tool</h2>
      <template v-if="store.isSessionActive">
        <template v-if="store.functionCallOutput">
          <template v-if="parsedArgs">
            <div class="flex flex-col gap-2">
              <p>Theme: {{ parsedArgs.theme }}</p>
              <div
                v-for="color in parsedArgs.colors"
                :key="color"
                class="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
                :style="{ backgroundColor: color }"
              >
                <p class="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
                  {{ color }}
                </p>
              </div>
              <pre class="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">{{ prettyOutput }}</pre>
            </div>
          </template>
          <p v-else class="text-red-600">Function output contains invalid JSON arguments.</p>
        </template>
        <p v-else>Ask for advice on a color palette...</p>
      </template>
      <p v-else>Start the session to use this tool...</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRealtimeStore } from "../stores/realtime";

const store = useRealtimeStore();

const parsedArgs = computed(() => store.parsedFunctionCallArguments);
const prettyOutput = computed(() => JSON.stringify(store.functionCallOutput, null, 2));
</script>
