<template>
  <div class="flex min-w-0 flex-col gap-2 rounded-xl border border-ui-border bg-ui-surface p-3 shadow-soft sm:p-4">
    <dt class="flex min-w-0 items-center gap-2 text-xs font-medium text-ui-mutedText">
      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ui-muted text-ui-icon">
        <component :is="icon" class="h-4 w-4" aria-hidden="true" />
      </span>
      {{ label }}
    </dt>
    <dd class="min-w-0 break-words text-sm font-semibold leading-5 text-ui-text">
      <slot />
    </dd>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; label: string }>()
</script>
