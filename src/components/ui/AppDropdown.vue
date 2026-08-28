<template>
  <Teleport to="body">
    <Transition name="dropdown-fade">
      <div
        v-if="open"
        ref="dropdownElement"
        class="ui-popover fixed z-[300] overflow-y-auto overscroll-contain"
        :class="contentClass"
        :style="dropdownStyle"
        :data-placement="placement"
        :role="role"
        data-ui-floating-layer
        @mouseenter="emit('pointer-enter')"
        @mouseleave="emit('pointer-leave')"
        @keydown.escape.prevent.stop="emitClose"
      >
        <slot :placement="placement" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  anchor: HTMLElement | null
  role?: 'listbox' | 'menu' | 'dialog' | 'tooltip'
  maxHeight?: number
  minHeight?: number
  gap?: number
  matchWidth?: boolean
  contentClass?: string
}>(), {
  role: 'listbox',
  maxHeight: 288,
  minHeight: 80,
  gap: 2,
  matchWidth: true,
  contentClass: undefined,
})

const emit = defineEmits<{
  close: []
  'pointer-enter': []
  'pointer-leave': []
}>()

const dropdownElement = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})
const placement = ref<'top' | 'bottom'>('bottom')
let resizeObserver: ResizeObserver | null = null

function emitClose() {
  emit('close')
  props.anchor?.focus?.()
}

function updatePosition() {
  if (!props.open || !props.anchor) return

  const rect = props.anchor.getBoundingClientRect()
  const viewportPadding = 8
  const spaceBelow = window.innerHeight - rect.bottom - props.gap - viewportPadding
  const spaceAbove = rect.top - props.gap - viewportPadding
  const desiredHeight = Math.min(props.maxHeight, Math.max(props.minHeight, dropdownElement.value?.scrollHeight || props.maxHeight))
  const openAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow
  const availableHeight = Math.max(48, openAbove ? spaceAbove : spaceBelow)
  const maxHeight = Math.min(props.maxHeight, availableHeight)
  const width = props.matchWidth
    ? Math.min(rect.width, window.innerWidth - viewportPadding * 2)
    : Math.min(Math.max(rect.width, dropdownElement.value?.scrollWidth || rect.width), window.innerWidth - viewportPadding * 2)
  const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - width - viewportPadding)

  placement.value = openAbove ? 'top' : 'bottom'
  dropdownStyle.value = openAbove
    ? {
        bottom: `${window.innerHeight - rect.top + props.gap}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
      }
    : {
        top: `${rect.bottom + props.gap}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
      }
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node

  const floatingLayer = target instanceof Element ? target.closest('[data-ui-floating-layer]') : null

  if (!props.anchor?.contains(target) && !dropdownElement.value?.contains(target) && !floatingLayer) {
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') {
    event.preventDefault()
    emitClose()
  }
}

watch(() => props.open, async (open) => {
  if (!open) return
  await nextTick()
  updatePosition()
})

watch(() => props.anchor, (anchor) => {
  resizeObserver?.disconnect()
  resizeObserver = null

  if (anchor && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updatePosition)
    resizeObserver.observe(anchor)
  }
}, { immediate: true })

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

.ui-popover[data-placement='bottom'] {
  border-top-left-radius: calc(var(--rw-radius-control) * 0.7);
  border-top-right-radius: calc(var(--rw-radius-control) * 0.7);
}

.ui-popover[data-placement='top'] {
  border-bottom-left-radius: calc(var(--rw-radius-control) * 0.7);
  border-bottom-right-radius: calc(var(--rw-radius-control) * 0.7);
}
</style>
