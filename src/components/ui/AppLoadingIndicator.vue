<template>
  <div role="status" class="flex items-center justify-center gap-2 text-sm text-ui-mutedText">
    <IconLoader2 class="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'

withDefaults(defineProps<{ label?: string }>(), { label: 'Ładowanie danych…' })
</script>
