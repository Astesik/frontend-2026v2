<template>
  <span
    ref="anchorElement"
    class="inline-flex"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @focusin="open = true"
    @focusout="open = false"
  >
    <slot />
  </span>
  <AppDropdown :open="open" :anchor="anchorElement" role="tooltip" :match-width="false" :max-height="160" content-class="max-w-xs px-2.5 py-1.5 text-xs leading-4 text-ui-text-secondary" @close="open = false">
    {{ text }}
  </AppDropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppDropdown from './AppDropdown.vue'

defineProps<{ text: string }>()
const open = ref(false)
const anchorElement = ref<HTMLElement | null>(null)
</script>
