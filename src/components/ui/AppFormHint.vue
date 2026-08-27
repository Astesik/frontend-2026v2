<template>
  <p :id="id" class="ui-hint"><slot /></p>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ id?: string }>(), { id: undefined })
</script>
