<template>
  <main class="min-h-screen bg-app-light text-slate-950 dark:bg-app-dark dark:text-slate-50">
    <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
            <Route class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm font-semibold">Routewise</p>
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
