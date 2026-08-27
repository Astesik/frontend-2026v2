<template>
  <section class="ui-surface">
    <div v-if="title || description || $slots.actions" :class="headerClasses">
      <div>
        <h2 v-if="title" class="ui-section-title">
          {{ title }}
        </h2>
        <p v-if="description" class="mt-1 ui-body-sm text-ui-mutedText">
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
  'flex items-start justify-between gap-4 border-b border-ui-divider',
  props.compact ? 'px-4 py-3' : 'px-5 py-4',
])
</script>
