<template>
  <Teleport :to="workspacePortal">
    <div v-if="open" class="fixed inset-0 z-[360] flex items-end justify-center bg-transparent p-3 md:hidden" @click.self="$emit('close')" @keydown.esc.stop="$emit('close')">
      <section role="dialog" aria-modal="true" aria-label="Dodaj zdjęcie" class="w-full max-w-sm overflow-hidden rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-surface shadow-modal">
        <header class="flex items-center justify-between border-b border-ui-divider px-4 py-3">
          <p class="ui-card-title">Dodaj zdjęcie</p>
          <AppIconButton label="Zamknij" size="sm" variant="ghost" @click="$emit('close')"><X class="h-4 w-4" /></AppIconButton>
        </header>
        <div class="grid gap-2 p-3">
          <AppButton variant="secondary" full-width @click="$emit('choose', 'gallery')"><ImagePlus class="h-4 w-4" />Wybierz z galerii</AppButton>
          <AppButton variant="secondary" full-width @click="$emit('choose', 'camera')"><Camera class="h-4 w-4" />Zrób zdjęcie</AppButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useWorkspacePortal } from '@/composables/useWorkspace'
import { Camera, ImagePlus, X } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppIconButton from './AppIconButton.vue'

defineProps<{ open: boolean }>()
defineEmits<{ close: []; choose: [source: 'gallery' | 'camera'] }>()
const workspacePortal = useWorkspacePortal()
</script>
