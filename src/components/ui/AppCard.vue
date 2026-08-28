<template>
  <section class="ui-surface">
    <div v-if="title || description || $slots.actions" :class="headerClasses">
      <div>
        <h2 v-if="title" class="flex items-center gap-2 ui-section-title">
          <component :is="icon" v-if="icon" class="h-4 w-4 shrink-0 text-ui-icon" />
          <span>{{ title }}</span>
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
import { computed, type Component } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  compact?: boolean
  contentClass?: string
  icon?: Component
}>(), {
  title: undefined,
  description: undefined,
  compact: false,
  contentClass: undefined,
  icon: undefined,
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
