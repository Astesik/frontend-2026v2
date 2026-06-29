<template>
  <div class="flex h-screen overflow-hidden bg-app-light text-slate-950 dark:bg-app-dark dark:text-slate-50">
    <AppSidebar />
    <main class="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-app-light px-3 dark:border-app-border dark:bg-app-dark md:hidden">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-app-border dark:bg-app-panel dark:text-slate-100 dark:hover:bg-app-elevated"
          aria-label="Otwórz menu"
          @click="uiStore.toggleMobileSidebar()"
        >
          <Menu class="h-5 w-5" />
        </button>
        <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">Routewise</p>
        <span class="h-10 w-10" aria-hidden="true"></span>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto">
      <div :class="contentClasses">
        <RouterView />
      </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'

const route = useRoute()
const fleetStore = useFleetStore()
const uiStore = useUiStore()

const contentClasses = computed(() => route.meta.fullBleed
  ? 'h-full w-full'
  : 'w-full px-5 py-6 lg:px-8')

onMounted(() => {
  void fleetStore.loadFleetData()
})
</script>
