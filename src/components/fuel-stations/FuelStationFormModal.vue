<template>
  <AppModal :open="open" :title="station ? 'Edytuj stację' : 'Dodaj stację'" size="md" :busy="store.isSaving" @close="$emit('close')">
    <form id="fuel-station-form" class="grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="save">
      <AppSelect v-model="form.provider" label="Dostawca" :options="store.providers.map(p => ({ value: p.code, label: p.code }))" :disabled="Boolean(station) || store.isSaving" />
      <AppInput v-model="form.stationCode" label="Kod stacji" required :disabled="store.isSaving" />
      <AppInput v-model="form.stationName" label="Nazwa stacji" required class="sm:col-span-2" :disabled="store.isSaving" />
      <AppInput v-model="form.country" label="Kraj" required class="sm:col-span-2" :disabled="store.isSaving" />
      <AppInput v-model="form.lat" label="Szerokość GPS" type="number" step="any" min="-90" max="90" :disabled="store.isSaving" />
      <AppInput v-model="form.lng" label="Długość GPS" type="number" step="any" min="-180" max="180" :disabled="store.isSaving" />
      <p v-if="error" class="ui-error sm:col-span-2" role="alert">{{ error }}</p>
    </form>
    <template #footer><AppButton variant="secondary" :disabled="store.isSaving" @click="$emit('close')">Anuluj</AppButton><AppButton type="submit" form="fuel-station-form" :disabled="store.isSaving"><Save class="h-4 w-4" />Zapisz</AppButton></template>
  </AppModal>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspaceDirty } from '@/composables/useWorkspace'
import { reactive, ref, watch } from 'vue'
import { Save } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import type { FuelStation } from '@/types/fuelStation'
const props = defineProps<{ open: boolean; station: FuelStation | null }>()
const emit = defineEmits<{ close: [] }>()
const store = useFuelStationStore(), error = ref('')
const form = reactive({ provider: 'IDS', stationCode: '', stationName: '', country: '', lat: '', lng: '' })
watch(() => props.open, open => { if (!open) return; error.value = ''; const s = props.station; Object.assign(form, { provider: s?.provider || 'IDS', stationCode: s?.stationCode || '', stationName: s?.stationName || '', country: s?.country || '', lat: s?.lat == null ? '' : String(s.lat), lng: s?.lng == null ? '' : String(s.lng) }) })
async function save() {
  if (!form.stationCode.trim() || !form.stationName.trim() || !form.country.trim()) { error.value = 'Uzupełnij kod, nazwę stacji i kraj.'; return }
  const lat = form.lat.trim() === '' ? null : Number(form.lat), lng = form.lng.trim() === '' ? null : Number(form.lng)
  if ((lat === null) !== (lng === null) || (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) { error.value = 'Podaj poprawną parę współrzędnych albo pozostaw oba pola puste.'; return }
  if (await store.saveStation({ provider: form.provider, stationCode: form.stationCode.trim(), stationName: form.stationName.trim(), country: form.country.trim(), lat, lng }, props.station?.id)) emit('close')
}
useWorkspaceDirty(computed(() => props.open))
</script>
