<template>
  <button :class="computedClass" @click="$emit('click')">
    <slot name="icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ className?: string }>();
defineEmits<{ click: [] }>();

const computedClass = computed(
  () =>
    `bg-gray-800 text-white rounded-full p-4 flex items-center gap-1 hover:opacity-90 ${props.className ?? ""}`,
);
</script>
