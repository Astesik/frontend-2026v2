<template>
  <div
    ref="tabListElement"
    class="inline-flex max-w-full flex-wrap items-center gap-1 rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-muted p-1"
    :aria-label="ariaLabel"
    role="tablist"
    @keydown="handleKeydown"
  >
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      class="inline-flex min-w-0 items-center justify-center gap-2 rounded-[var(--rw-radius-control)] font-medium transition-colors duration-150 focus-visible:z-10 disabled:cursor-not-allowed disabled:text-ui-disabled-text"
      :class="[
        sizeClasses[size],
        modelValue === item.value
          ? 'bg-ui-surface text-ui-text shadow-soft'
          : 'text-ui-text-secondary hover:bg-ui-hover hover:text-ui-text',
      ]"
      :aria-selected="modelValue === item.value"
      :tabindex="modelValue === item.value ? 0 : -1"
      :disabled="item.disabled"
      @click="select(item.value)"
    >
      <component v-if="item.icon" :is="item.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
      <span class="truncate">{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, type Component } from 'vue'

export interface AppTabItem {
  value: string
  label: string
  icon?: Component
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  items: AppTabItem[]
  ariaLabel?: string
  size?: 'sm' | 'md'
}>(), {
  ariaLabel: 'Wybierz widok',
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const tabListElement = ref<HTMLElement | null>(null)

const sizeClasses = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
}

function select(value: string) {
  const item = props.items.find((candidate) => candidate.value === value)
  if (!item?.disabled) emit('update:modelValue', value)
}

function handleKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

  const enabledItems = props.items.filter((item) => !item.disabled)
  if (!enabledItems.length) return

  event.preventDefault()
  const currentIndex = Math.max(0, enabledItems.findIndex((item) => item.value === props.modelValue))
  let nextIndex = currentIndex

  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = enabledItems.length - 1
  if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabledItems.length

  const nextItem = enabledItems[nextIndex]
  if (!nextItem) return
  select(nextItem.value)

  requestAnimationFrame(() => {
    const tabs = tabListElement.value?.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)')
    tabs?.[nextIndex]?.focus()
  })
}
</script>
