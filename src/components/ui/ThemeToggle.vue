<template>
  <AppIconButton
    v-if="compact"
    :label="uiStore.isDark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'"
    @click="uiStore.toggleTheme()"
  >
    <Sun v-if="uiStore.isDark" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
  </AppIconButton>

  <AppButton v-else variant="secondary" @click="uiStore.toggleTheme()">
    <Sun v-if="uiStore.isDark" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
    {{ uiStore.isDark ? 'Jasny' : 'Ciemny' }}
  </AppButton>
</template>

<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppIconButton from './AppIconButton.vue'
import { useUiStore } from '@/stores/uiStore'

withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const uiStore = useUiStore()
</script>
