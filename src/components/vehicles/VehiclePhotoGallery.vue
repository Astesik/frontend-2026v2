<template>
  <div class="min-w-0">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ photos.length }} {{ photos.length === 1 ? 'zdjęcie' : 'zdjęć' }}
      </p>
      <AppButton
        v-if="canAddPhotos"
        size="sm"
        variant="secondary"
        :loading="isMutating"
        @click="photoInput?.click()"
      >
        <ImagePlus class="h-4 w-4" />
        Dodaj zdjęcie
      </AppButton>
      <input
        ref="photoInput"
        class="hidden"
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
        @change="handlePhotoSelection"
      />
    </div>

    <p v-if="fileError" class="mb-3 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-600 dark:border-danger-400 dark:bg-app-elevated dark:text-danger-400">
      {{ fileError }}
    </p>

    <div v-if="isLoading" class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      Pobieranie zdjęć...
    </div>

    <div v-else-if="!photos.length" class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-app-border">
      <Images class="mx-auto h-6 w-6 text-slate-300 dark:text-app-muted" />
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Brak zdjęć pojazdu.</p>
    </div>

    <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <article
        v-for="photo in photos"
        :key="photo.id"
        class="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-app-border dark:bg-app-dark"
      >
        <button
          type="button"
          class="block aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-app-elevated"
          :disabled="!photoUrls[String(photo.id)]"
          :aria-label="`Powiększ ${photo.originalFilename}`"
          @click="openPreview(photo)"
        >
          <img
            v-if="photoUrls[String(photo.id)]"
            :src="photoUrls[String(photo.id)]"
            :alt="photo.originalFilename"
            class="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
          />
          <div v-else class="flex h-full items-center justify-center text-xs text-slate-400 dark:text-app-muted">
            {{ previewErrors.has(photo.id) ? 'Brak podglądu' : 'Ładowanie...' }}
          </div>
        </button>

        <div class="flex min-w-0 items-center gap-1 border-t border-slate-200 px-2 py-1.5 dark:border-app-border">
          <span class="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 dark:text-slate-200" :title="photo.originalFilename">
            {{ photo.originalFilename }}
          </span>
          <button
            type="button"
            class="photo-action"
            title="Pobierz"
            :aria-label="`Pobierz ${photo.originalFilename}`"
            @click="downloadPhoto(photo)"
          >
            <Download class="h-3.5 w-3.5" />
          </button>
          <button
            v-if="canDeletePhoto(photo)"
            type="button"
            class="photo-action hover:text-danger-600 dark:hover:text-danger-400"
            title="Usuń"
            :aria-label="`Usuń ${photo.originalFilename}`"
            @click="photoToDelete = photo"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </article>
    </div>

    <Teleport to="body">
      <div
        v-if="previewPhoto"
        class="fixed inset-0 z-[120] flex flex-col bg-slate-950/95"
        @click.self="closePreview"
      >
        <header class="flex shrink-0 items-center justify-between gap-3 px-3 py-2 text-white sm:px-5 sm:py-3">
          <p class="min-w-0 truncate text-sm font-semibold">{{ previewPhoto.originalFilename }}</p>
          <div class="flex shrink-0 items-center gap-1">
            <button type="button" class="preview-action" aria-label="Pomniejsz" title="Pomniejsz" @click="changeZoom(-0.25)">
              <ZoomOut class="h-4 w-4" />
            </button>
            <button type="button" class="preview-action" aria-label="Powiększ" title="Powiększ" @click="changeZoom(0.25)">
              <ZoomIn class="h-4 w-4" />
            </button>
            <button type="button" class="preview-action" aria-label="Pobierz zdjęcie" title="Pobierz" @click="downloadPhoto(previewPhoto)">
              <Download class="h-4 w-4" />
            </button>
            <button type="button" class="preview-action" aria-label="Zamknij podgląd" title="Zamknij" @click="closePreview">
              <X class="h-4 w-4" />
            </button>
          </div>
        </header>
        <div class="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-6" @click.self="closePreview">
          <img
            :src="photoUrls[String(previewPhoto.id)]"
            :alt="previewPhoto.originalFilename"
            class="max-h-full max-w-full origin-center object-contain transition-transform duration-150"
            :style="{ transform: `scale(${previewZoom})` }"
          />
        </div>
      </div>

      <div
        v-if="photoToDelete"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4"
        @click.self="photoToDelete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć zdjęcie?</h2>
            <p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ photoToDelete.originalFilename }}</p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="photoToDelete = null">Anuluj</AppButton>
            <AppButton variant="danger" :loading="isMutating" @click="confirmDeletePhoto">Usuń</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Download, ImagePlus, Images, Trash2, X, ZoomIn, ZoomOut } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import { vehicleService } from '@/services/vehicleService'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'
import type { VehiclePhoto } from '@/types/fleet'

const props = defineProps<{
  vehicleId: number | string
}>()

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_PHOTO_SIZE = 20 * 1024 * 1024
const authStore = useAuthStore()
const fleetStore = useFleetStore()
const uiStore = useUiStore()
const photoInput = ref<HTMLInputElement | null>(null)
const photoUrls = ref<Record<string, string>>({})
const previewErrors = ref<Set<number>>(new Set())
const previewPhoto = ref<VehiclePhoto | null>(null)
const previewZoom = ref(1)
const photoToDelete = ref<VehiclePhoto | null>(null)
const fileError = ref('')
let previewLoadGeneration = 0

const vehicleKey = computed(() => String(props.vehicleId))
const photos = computed(() => fleetStore.vehiclePhotosByVehicleId[vehicleKey.value] || [])
const isLoading = computed(() => fleetStore.vehiclePhotoLoadingIds.has(vehicleKey.value))
const isMutating = computed(() => fleetStore.vehiclePhotoMutatingIds.has(vehicleKey.value))
const canReadPhotos = computed(() => authStore.hasActiveCompanyPermission('vehicle_photos.read'))
const canAddPhotos = computed(() => authStore.hasActiveCompanyPermission('vehicle_photos.add'))
const currentUserId = computed(() => authStore.user?.userId ?? authStore.user?.id ?? authStore.user?.uid)

function canDeletePhoto(photo: VehiclePhoto) {
  const isOwner = currentUserId.value !== undefined && photo.uploadedBy?.id !== undefined
    && String(currentUserId.value) === String(photo.uploadedBy.id)
  return isOwner || authStore.hasActiveCompanyPermission('vehicle_photos.delete_any')
}

function revokePhotoUrl(photoId: number | string) {
  const key = String(photoId)
  const url = photoUrls.value[key]

  if (url) {
    URL.revokeObjectURL(url)
    const nextUrls = { ...photoUrls.value }
    delete nextUrls[key]
    photoUrls.value = nextUrls
  }
}

function revokeAllPhotoUrls() {
  Object.values(photoUrls.value).forEach((url) => URL.revokeObjectURL(url))
  photoUrls.value = {}
}

async function syncPhotoUrls(nextPhotos: VehiclePhoto[]) {
  const generation = ++previewLoadGeneration
  const validIds = new Set(nextPhotos.map((photo) => String(photo.id)))

  Object.keys(photoUrls.value).forEach((photoId) => {
    if (!validIds.has(photoId)) revokePhotoUrl(photoId)
  })

  await Promise.all(nextPhotos.map(async (photo) => {
    const key = String(photo.id)
    if (photoUrls.value[key]) return

    try {
      const blob = await vehicleService.loadVehiclePhotoBlob(photo, { silent: true })
      const objectUrl = URL.createObjectURL(blob)

      if (generation !== previewLoadGeneration || !photos.value.some((item) => item.id === photo.id)) {
        URL.revokeObjectURL(objectUrl)
        return
      }

      photoUrls.value = { ...photoUrls.value, [key]: objectUrl }
    } catch {
      previewErrors.value = new Set([...previewErrors.value, photo.id])
    }
  }))
}

function validatePhoto(file: File) {
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) return 'Dozwolone formaty: JPG, PNG, GIF i WEBP.'
  if (!file.size) return 'Wybrany plik jest pusty.'
  if (file.size > MAX_PHOTO_SIZE) return 'Zdjęcie może mieć maksymalnie 20 MB.'
  return ''
}

async function handlePhotoSelection(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !canAddPhotos.value) return

  fileError.value = validatePhoto(file)
  if (fileError.value) return

  try {
    const photo = await fleetStore.uploadVehiclePhoto(props.vehicleId, file)
    await syncPhotoUrls(photos.value)
    uiStore.addToast({ type: 'success', title: 'Zdjęcie dodane', message: 'Zdjęcie pojazdu zostało zapisane.' })
  } catch {
    // Global API interceptor handles 400, 401, 403, 404 and 413 responses.
  }
}

function openPreview(photo: VehiclePhoto) {
  if (!photoUrls.value[String(photo.id)]) return
  previewPhoto.value = photo
  previewZoom.value = 1
}

function closePreview() {
  previewPhoto.value = null
  previewZoom.value = 1
}

function changeZoom(delta: number) {
  previewZoom.value = Math.min(3, Math.max(0.5, previewZoom.value + delta))
}

async function downloadPhoto(photo: VehiclePhoto) {
  try {
    const blob = await vehicleService.downloadVehiclePhotoBlob(photo)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = photo.originalFilename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch {
    // Global API interceptor shows the backend error.
  }
}

async function confirmDeletePhoto() {
  const photo = photoToDelete.value
  if (!photo || !canDeletePhoto(photo)) return

  try {
    await fleetStore.deleteVehiclePhoto(props.vehicleId, photo.id)
    revokePhotoUrl(photo.id)
    if (previewPhoto.value?.id === photo.id) closePreview()
    photoToDelete.value = null
    uiStore.addToast({ type: 'success', title: 'Zdjęcie usunięte', message: 'Zdjęcie pojazdu zostało usunięte.' })
  } catch {
    // Keep the photo visible when the API request fails.
  }
}

watch(
  () => [vehicleKey.value, canReadPhotos.value] as const,
  async ([key, canRead]) => {
    closePreview()
    photoToDelete.value = null
    fileError.value = ''
    previewErrors.value = new Set()
    previewLoadGeneration += 1
    revokeAllPhotoUrls()
    if (key && canRead) await fleetStore.fetchVehiclePhotos(key)
  },
  { immediate: true },
)

watch(photos, (nextPhotos) => {
  void syncPhotoUrls(nextPhotos)
})

onBeforeUnmount(() => {
  previewLoadGeneration += 1
  revokeAllPhotoUrls()
})
</script>

<style scoped>
.photo-action,
.preview-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  transition: background-color 150ms ease, color 150ms ease;
}

.photo-action {
  height: 1.75rem;
  width: 1.75rem;
  flex: 0 0 1.75rem;
  color: rgb(var(--rw-app-muted));
}

.photo-action:hover {
  background: rgb(var(--rw-app-hover));
  color: rgb(var(--rw-app-text));
}

.preview-action {
  height: 2.25rem;
  width: 2.25rem;
  color: #fff;
}

.preview-action:hover {
  background: rgba(255, 255, 255, 0.14);
}
</style>
