<template>
  <RouterLink
    :to="to"
    :title="collapsed ? label : undefined"
    class="group flex h-11 items-center gap-3 rounded-2xl text-sm font-medium transition"
    :class="[collapsed ? 'mx-auto w-10 justify-center px-0' : 'w-full px-3', isActive ? activeClasses : inactiveClasses]"
  >
    <component :is="icon" class="h-5 w-5 shrink-0" />
    <span v-if="!collapsed" class="truncate">{{ label }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps<{
  to: string
  label: string
  icon: Component
  collapsed: boolean
}>()

const route = useRoute()

const isActive = computed(() => route.path === props.to || route.path.startsWith(`${props.to}/`))

const activeClasses = 'bg-white text-slate-950 shadow-sm dark:bg-app-elevated dark:text-slate-50'
const inactiveClasses = 'text-slate-500 hover:bg-white hover:text-slate-950 dark:text-app-muted dark:hover:bg-app-panel dark:hover:text-slate-50'
</script>
