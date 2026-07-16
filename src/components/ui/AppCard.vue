<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
    <div v-if="title || description || $slots.actions" :class="headerClasses">
      <div>
        <h2 v-if="title" class="text-base font-semibold text-slate-950 dark:text-slate-50">
          {{ title }}
        </h2>
        <p v-if="description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <div :class="contentClasses">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  compact?: boolean
  contentClass?: string
}>(), {
  title: undefined,
  description: undefined,
  compact: false,
  contentClass: undefined,
})

const contentClasses = computed(() => [
  props.compact ? 'p-4' : 'p-5',
  props.contentClass,
])

const headerClasses = computed(() => [
  'flex items-start justify-between gap-4 border-b border-slate-100 dark:border-app-border',
  props.compact ? 'px-4 py-3' : 'px-5 py-4',
])
</script>
