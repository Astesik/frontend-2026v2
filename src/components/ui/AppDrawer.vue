<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-[260] flex justify-end" @mousedown.self="requestClose">
        <div class="absolute inset-0 bg-ui-overlay/45 backdrop-blur-[1px]" aria-hidden="true" @mousedown="requestClose"></div>
        <aside
          ref="panelElement"
          class="relative z-10 flex h-full w-full flex-col border-l border-ui-border bg-ui-surface text-ui-text shadow-modal"
          :class="[sizeClasses[size], panelClass]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <header class="ui-modal-header">
            <slot name="header">
              <div class="min-w-0">
                <h2 v-if="title" :id="titleId" class="ui-section-title">{{ title }}</h2>
                <p v-if="description" :id="descriptionId" class="mt-1 ui-body-sm text-ui-mutedText">{{ description }}</p>
              </div>
            </slot>
            <AppIconButton v-if="closeable" label="Zamknij" variant="ghost" @click="requestClose">
              <X class="h-4 w-4" />
            </AppIconButton>
          </header>

          <div v-if="$slots.toolbar" class="shrink-0 border-b border-ui-divider px-5 py-2">
            <slot name="toolbar" />
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-5" :class="bodyClass">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="ui-modal-footer !mt-0" :class="footerClass">
            <slot name="footer" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import AppIconButton from './AppIconButton.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  closeable?: boolean
  busy?: boolean
  panelClass?: string
  bodyClass?: string
  footerClass?: string
}>(), {
  title: undefined,
  description: undefined,
  size: 'md',
  closeable: true,
  busy: false,
  panelClass: undefined,
  bodyClass: undefined,
  footerClass: undefined,
})

const emit = defineEmits<{ close: [] }>()
const panelElement = ref<HTMLElement | null>(null)
const titleId = `drawer-title-${Math.random().toString(16).slice(2)}`
const descriptionId = `drawer-description-${Math.random().toString(16).slice(2)}`
const sizeClasses = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' }
let previouslyFocused: HTMLElement | null = null

function requestClose() {
  if (!props.busy && props.closeable) emit('close')
}

function focusableElements() {
  return Array.from(panelElement.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  ) || []).filter((element) => !element.hasAttribute('hidden'))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }
  if (event.key !== 'Tab') return
  const focusable = focusableElements()
  if (!focusable.length) {
    event.preventDefault()
    panelElement.value?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async (open) => {
  if (open) {
    previouslyFocused = document.activeElement as HTMLElement | null
    await nextTick()
    const first = focusableElements()[0]
    if (first) first.focus()
    else panelElement.value?.focus()
  } else {
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }
})

onBeforeUnmount(() => previouslyFocused?.focus?.())
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 160ms ease;
}

.drawer-enter-active aside,
.drawer-leave-active aside {
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from aside,
.drawer-leave-to aside {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active,
  .drawer-leave-active,
  .drawer-enter-active aside,
  .drawer-leave-active aside {
    transition: none;
  }
}
</style>
