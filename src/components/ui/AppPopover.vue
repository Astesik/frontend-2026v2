<template>
  <span ref="anchorElement" class="inline-flex" @click="emit('update:open', !open)">
    <slot name="trigger" :open="open" />
  </span>
  <AppDropdown :open="open" :anchor="anchorElement" role="dialog" :match-width="matchWidth" :max-height="maxHeight" :content-class="contentClass" @close="emit('update:open', false)">
    <slot :close="() => emit('update:open', false)" />
  </AppDropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppDropdown from './AppDropdown.vue'

withDefaults(defineProps<{
  open: boolean
  matchWidth?: boolean
  maxHeight?: number
  contentClass?: string
}>(), {
  matchWidth: false,
  maxHeight: 320,
  contentClass: 'p-3',
})

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const anchorElement = ref<HTMLElement | null>(null)
</script>
