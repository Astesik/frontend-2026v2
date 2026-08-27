<template>
  <label :for="forId" class="ui-label">
    <slot>{{ label }}</slot>
    <span v-if="required" class="ml-0.5 text-danger-600 dark:text-danger-400" aria-hidden="true">*</span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  forId?: string
  label?: string
  required?: boolean
}>(), {
  forId: undefined,
  label: undefined,
  required: false,
})
</script>
