<template>
  <ol class="flex items-center" aria-label="Postęp formularza">
    <li v-for="(step, index) in steps" :key="step.label" class="flex items-center">
      <button
        type="button"
        class="group flex items-center gap-2 rounded-[var(--rw-radius-item)] p-1 text-left transition-colors disabled:cursor-default"
        :class="index === currentStep ? 'text-ui-text' : 'text-ui-mutedText'"
        :disabled="index > maxReachableStep"
        :aria-current="index === currentStep ? 'step' : undefined"
        :aria-label="`Krok ${index + 1}: ${step.label}`"
        @click="emit('select', index)"
      >
        <span
          class="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors"
          :class="dotClasses(index)"
        >
          <Check v-if="index < currentStep" class="h-3.5 w-3.5" aria-hidden="true" />
          <span v-else>{{ index + 1 }}</span>
        </span>
        <span class="hidden text-xs font-medium sm:block">{{ step.label }}</span>
      </button>

      <span
        v-if="index < steps.length - 1"
        class="mx-1 h-px w-5 bg-ui-border sm:w-8"
        aria-hidden="true"
      ></span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  steps: Array<{ label: string }>
  currentStep: number
  maxReachableStep?: number
}>(), {
  maxReachableStep: 0,
})

const emit = defineEmits<{
  select: [step: number]
}>()

function dotClasses(index: number) {
  if (index < props.currentStep) {
    return 'border-ui-text bg-ui-text text-ui-surface group-hover:opacity-80'
  }

  if (index === props.currentStep) {
    return 'border-ui-border-strong bg-ui-surface text-ui-text shadow-soft'
  }

  return 'border-ui-border bg-ui-muted text-ui-mutedText'
}
</script>
