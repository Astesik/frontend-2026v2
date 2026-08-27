<template>
  <Teleport to="body">
    <div class="fixed right-4 top-4 z-[400] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-3">
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-elevated p-4 shadow-popover"
          :role="toast.type === 'error' ? 'alert' : 'status'"
        >
          <div class="flex gap-3">
            <component :is="icons[toast.type]" :class="['mt-0.5 h-5 w-5 shrink-0', iconClasses[toast.type]]" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ui-text">
                {{ toast.title }}
              </p>
              <p v-if="toast.message" class="mt-1 text-sm text-ui-text-secondary">
                {{ toast.message }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-7 w-7 shrink-0 self-start items-center justify-center rounded-full p-0 text-ui-icon transition hover:bg-ui-hover hover:text-ui-text"
              aria-label="Zamknij powiadomienie"
              @click="uiStore.removeToast(toast.id)"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const iconClasses = {
  success: 'text-success-600 dark:text-success-400',
  error: 'text-danger-600 dark:text-danger-400',
  info: 'text-ui-icon',
  warning: 'text-ui-text-secondary',
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
