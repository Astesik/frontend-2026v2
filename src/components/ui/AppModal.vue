<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5" @mousedown.self="requestBackdropClose">
        <div class="ui-modal-overlay" aria-hidden="true" @mousedown="requestBackdropClose"></div>
        <section
          ref="panelElement"
          class="ui-modal-panel relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full flex-col sm:max-h-[calc(100dvh-2.5rem)]"
          :class="[sizeClasses[size], panelClass]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <header v-if="title || description || $slots.header" class="ui-modal-header">
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

          <div class="ui-modal-body" :class="bodyClass">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="ui-modal-footer" :class="footerClass">
            <slot name="footer" />
          </footer>
        </section>
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
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeable?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  busy?: boolean
  panelClass?: string
  bodyClass?: string
  footerClass?: string
}>(), {
  title: undefined,
  description: undefined,
  size: 'md',
  closeable: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  busy: false,
  panelClass: undefined,
  bodyClass: undefined,
  footerClass: undefined,
})

const emit = defineEmits<{ close: [] }>()
const panelElement = ref<HTMLElement | null>(null)
const titleId = `modal-title-${Math.random().toString(16).slice(2)}`
const descriptionId = `modal-description-${Math.random().toString(16).slice(2)}`
let previouslyFocused: HTMLElement | null = null

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:h-[calc(100dvh-2.5rem)] sm:max-w-[calc(100vw-2.5rem)]',
}

function requestClose() {
  if (!props.busy && props.closeable) emit('close')
}

function requestBackdropClose() {
  if (props.closeOnBackdrop) requestClose()
}

function focusableElements() {
  return Array.from(panelElement.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  ) || []).filter((element) => !element.hasAttribute('hidden'))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (props.closeOnEscape) requestClose()
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
    const firstFocusable = focusableElements()[0]
    if (firstFocusable) firstFocusable.focus()
    else panelElement.value?.focus()
    return
  }

  previouslyFocused?.focus?.()
  previouslyFocused = null
})

onBeforeUnmount(() => previouslyFocused?.focus?.())
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 160ms ease;
}

.modal-fade-enter-active section,
.modal-fade-leave-active section {
  transition: transform 180ms ease, opacity 160ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to,
.modal-fade-enter-from section,
.modal-fade-leave-to section {
  opacity: 0;
}

.modal-fade-enter-from section,
.modal-fade-leave-to section {
  transform: translateY(8px) scale(0.99);
}
</style>
