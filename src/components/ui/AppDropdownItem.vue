<template>
  <button
    type="button"
    class="ui-dropdown-item"
    :class="selected ? 'ui-dropdown-item-selected' : ''"
    :disabled="disabled"
    :role="role"
    :aria-selected="role === 'option' ? selected : undefined"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  selected?: boolean
  disabled?: boolean
  role?: 'option' | 'menuitem'
}>(), {
  selected: false,
  disabled: false,
  role: 'option',
})
</script>
