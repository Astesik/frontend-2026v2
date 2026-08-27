<template>
  <RouterLink
    :to="to"
    class="ui-icon-button"
    :class="sizeClasses[size]"
    :aria-label="label"
    :title="title || label"
  >
    <slot />
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{
  to: RouteLocationRaw
  label: string
  title?: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  title: undefined,
  size: 'lg',
})

const sizeClasses = {
  sm: '!h-8 !w-8',
  md: '',
  lg: '!h-10 !w-10',
}
</script>
