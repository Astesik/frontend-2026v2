<template>
  <div class="flex h-dvh overflow-hidden bg-ui-canvas text-ui-text">
    <AppSidebar />
    <main class="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-ui-canvas">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-3 md:hidden">
        <AppIconButton label="Otwórz menu" size="lg" @click="uiStore.toggleMobileSidebar()">
          <Menu class="h-5 w-5" />
        </AppIconButton>
        <p class="ui-card-title">Routewise</p>
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
import AppIconButton from '@/components/ui/AppIconButton.vue'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'

const route = useRoute()
const fleetStore = useFleetStore()
const uiStore = useUiStore()

const contentClasses = computed(() => route.meta.fullBleed
  ? 'h-full w-full'
  : 'w-full px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 lg:px-8')

onMounted(() => {
  void fleetStore.loadFleetData()
})
</script>
