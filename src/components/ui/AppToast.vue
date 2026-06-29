<template>
  <Teleport to="body">
    <div class="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-3">
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-app-border dark:bg-app-panel"
        >
          <div class="flex gap-3">
            <component :is="icons[toast.type]" :class="['mt-0.5 h-5 w-5 shrink-0', iconClasses[toast.type]]" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">
                {{ toast.title }}
              </p>
              <p v-if="toast.message" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ toast.message }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-app-elevated dark:hover:text-slate-200"
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
  info: 'text-slate-600 dark:text-slate-300',
  warning: 'text-slate-700 dark:text-slate-200',
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
