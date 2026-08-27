<template>
  <p :id="id" role="alert" class="ui-error"><slot /></p>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ id?: string }>(), { id: undefined })
</script>
