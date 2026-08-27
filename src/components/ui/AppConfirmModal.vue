<template>
  <AppModal
    :open="open"
    :title="title"
    :description="description"
    size="sm"
    :busy="busy"
    @close="emit('close')"
  >
    <slot />

    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="emit('close')">
        {{ cancelLabel }}
      </AppButton>
      <AppButton :variant="confirmVariant" :loading="busy" :disabled="confirmDisabled" @click="emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue'
import AppModal from './AppModal.vue'

withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  confirmDisabled?: boolean
  busy?: boolean
}>(), {
  description: undefined,
  confirmLabel: 'Potwierdź',
  cancelLabel: 'Anuluj',
  confirmVariant: 'primary',
  confirmDisabled: false,
  busy: false,
})

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>
