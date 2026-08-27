<template>
  <AppFormField :id="inputId" :label="label" :hint="hint" :error="error" :required="required" :compact="size === 'sm'">
    <template #default="{ describedBy }">
      <div class="relative">
        <input
          :id="inputId"
          :value="modelValue"
          :type="visible ? 'text' : 'password'"
          :placeholder="placeholder"
          :autocomplete="autocomplete"
          :disabled="disabled"
          :required="required"
          :aria-invalid="Boolean(error)"
          :aria-describedby="describedBy"
          class="ui-field-control pr-11"
          :class="[
            size === 'sm' ? 'ui-field-sm' : 'ui-field-md',
            error ? '!border-danger-500 focus:!ring-danger-100 dark:!border-danger-400' : '',
          ]"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
        <AppIconButton
          :label="visible ? 'Ukryj hasło' : 'Pokaż hasło'"
          size="sm"
          variant="ghost"
          class="absolute right-1 top-1/2 -translate-y-1/2"
          @click="visible = !visible"
        >
          <EyeOff v-if="visible" class="h-4 w-4" />
          <Eye v-else class="h-4 w-4" />
        </AppIconButton>
      </div>
    </template>
  </AppFormField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import AppFormField from './AppFormField.vue'
import AppIconButton from './AppIconButton.vue'

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md'
}>(), {
  id: undefined,
  label: undefined,
  hint: undefined,
  error: undefined,
  placeholder: '',
  autocomplete: 'current-password',
  disabled: false,
  required: false,
  size: 'md',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const visible = ref(false)
const generatedId = `password-${Math.random().toString(16).slice(2)}`
const inputId = computed(() => props.id || generatedId)
</script>
