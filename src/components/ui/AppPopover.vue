<template>
  <span
    ref="anchorElement"
    :id="triggerId"
    :class="['inline-flex', triggerClass]"
    :style="triggerStyle"
    @click="togglePinned"
    @mouseenter="scheduleOpen"
    @mouseleave="scheduleClose"
  >
    <slot name="trigger" :open="open" />
  </span>
  <AppDropdown
    :open="open"
    :anchor="anchorElement"
    role="dialog"
    :match-width="matchWidth"
    :use-anchor-min-width="useAnchorMinWidth"
    :max-height="maxHeight"
    :content-class="contentClass"
    @close="closePopover"
    @pointer-enter="cancelTimers"
    @pointer-leave="scheduleClose"
  >
    <slot :close="closePopover" />
  </AppDropdown>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AppDropdown from './AppDropdown.vue'

const props = withDefaults(defineProps<{
  open: boolean
  matchWidth?: boolean
  useAnchorMinWidth?: boolean
  maxHeight?: number
  contentClass?: string
  triggerClass?: string
  triggerStyle?: Record<string, string>
  triggerId?: string
  openOnHover?: boolean
  hoverDelay?: number
}>(), {
  matchWidth: false,
  useAnchorMinWidth: true,
  maxHeight: 320,
  contentClass: 'p-3',
  triggerClass: '',
  triggerStyle: undefined,
  triggerId: undefined,
  openOnHover: false,
  hoverDelay: 700,
})

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const anchorElement = ref<HTMLElement | null>(null)
const pinned = ref(false)
let openTimer: number | null = null
let closeTimer: number | null = null

function cancelTimers() {
  if (openTimer !== null) window.clearTimeout(openTimer)
  if (closeTimer !== null) window.clearTimeout(closeTimer)
  openTimer = null
  closeTimer = null
}

function scheduleOpen() {
  if (!props.openOnHover || props.open) return
  cancelTimers()
  openTimer = window.setTimeout(() => {
    emit('update:open', true)
    openTimer = null
  }, props.hoverDelay)
}

function scheduleClose() {
  if (!props.openOnHover || pinned.value) return
  if (openTimer !== null) window.clearTimeout(openTimer)
  openTimer = null
  closeTimer = window.setTimeout(() => {
    emit('update:open', false)
    closeTimer = null
  }, 140)
}

function togglePinned() {
  cancelTimers()
  pinned.value = !(props.open && pinned.value)
  emit('update:open', pinned.value)
}

function closePopover() {
  cancelTimers()
  pinned.value = false
  emit('update:open', false)
}

watch(() => props.open, (open) => {
  if (!open) pinned.value = false
})

onBeforeUnmount(cancelTimers)
</script>
