<template>
  <component :is="type?.toUpperCase() === 'TRAILER' ? Box : Truck" aria-hidden="true" />
</template>
<script setup lang="ts">
import { IconBox as Box, IconTruck as Truck } from '@tabler/icons-vue'
defineProps<{ type?: string | null }>()
</script>
