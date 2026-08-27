<template>
  <main class="h-screen overflow-y-auto bg-ui-canvas text-ui-text">
    <div class="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface text-ui-text shadow-soft">
            <Route class="h-5 w-5" />
          </div>
          <div>
            <p class="ui-card-title">Routewise</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div class="grid flex-1 place-items-center py-12">
        <RouterView />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Route } from 'lucide-vue-next'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
</script>
