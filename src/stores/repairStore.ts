import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mechanicService, type MechanicPayload } from '@/services/mechanicService'
import { placeService } from '@/services/placeService'
import { repairService } from '@/services/repairService'
import type { VehicleRepairHistoryItem } from '@/services/repairService'
import type {
  Mechanic,
  PlaceSelectItem,
  Repair,
  RepairComment,
  RepairFaultPayload,
  RepairFaultUpdatePayload,
  RepairPayload,
  RepairPhoto,
  RepairUpdatePayload,
  RepairWeek,
} from '@/types/repair'

export const useRepairStore = defineStore('repairs', () => {
  const repairs = ref<Repair[]>([])
  const weeks = ref<RepairWeek[]>([])
  const fieldAndUnassigned = ref<Repair[]>([])
  const currentRepair = ref<Repair | null>(null)
  const currentRepairComments = ref<RepairComment[]>([])
  const repairDetailsById = ref<Record<string, Repair>>({})
  const repairCommentsById = ref<Record<string, RepairComment[]>>({})
  const mechanics = ref<Mechanic[]>([])
  const places = ref<PlaceSelectItem[]>([])
  const vehicleRepairHistory = ref<Record<string, VehicleRepairHistoryItem[]>>({})
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const isVehicleRepairHistoryLoading = ref(false)
  const isMutating = ref(false)
  const isPhotoMutating = ref(false)

  const repairById = computed(() => new Map(repairs.value.map((repair) => [repair.id, repair])))

  function upsertRepair(nextRepair: Repair) {
    const index = repairs.value.findIndex((repair) => repair.id === nextRepair.id)

    if (index >= 0) {
      repairs.value.splice(index, 1, nextRepair)
    } else {
      repairs.value = [...repairs.value, nextRepair]
    }

    weeks.value = weeks.value.map((week) => ({
      ...week,
      repairs: week.repairs.map((repair) => repair.id === nextRepair.id ? nextRepair : repair),
    }))

    fieldAndUnassigned.value = fieldAndUnassigned.value.map((repair) => repair.id === nextRepair.id ? nextRepair : repair)

    if (currentRepair.value?.id === nextRepair.id) {
      currentRepair.value = {
        ...nextRepair,
        comments: currentRepairComments.value,
      }
    }

    const detailKey = String(nextRepair.id)
    const cachedComments = repairCommentsById.value[detailKey] || repairDetailsById.value[detailKey]?.comments

    if (repairDetailsById.value[detailKey]) {
      repairDetailsById.value = {
        ...repairDetailsById.value,
        [detailKey]: {
          ...nextRepair,
          comments: cachedComments,
        },
      }
    }
  }

  async function loadRepairs(options?: { silent?: boolean }) {
    const [repairList, weekList] = await Promise.all([
      repairService.getRepairs(undefined, options),
      repairService.getRepairWeeks(options),
    ])

    repairs.value = repairList
    weeks.value = weekList.weeks
    fieldAndUnassigned.value = weekList.fieldAndUnassigned
  }

  async function loadListData(options?: { silent?: boolean }) {
    isLoading.value = true

    try {
      await loadRepairs(options)
    } finally {
      isLoading.value = false
    }
  }

  async function loadDictionaries() {
    const [mechanicsResult, placesResult] = await Promise.allSettled([
      mechanicService.getMechanics({ silent: true }),
      placeService.getPlacesSelect({ silent: true }),
    ])

    if (mechanicsResult.status === 'fulfilled') {
      mechanics.value = mechanicsResult.value
    }

    if (placesResult.status === 'fulfilled') {
      places.value = placesResult.value
    }
  }

  async function createMechanic(payload: Required<Pick<MechanicPayload, 'firstName' | 'lastName'>>) {
    isMutating.value = true

    try {
      const mechanic = await mechanicService.createMechanic(payload)
      mechanics.value = [...mechanics.value, mechanic]
      return mechanic
    } finally {
      isMutating.value = false
    }
  }

  async function updateMechanic(mechanicId: number | string, payload: MechanicPayload) {
    isMutating.value = true

    try {
      const mechanic = await mechanicService.updateMechanic(mechanicId, payload)
      const index = mechanics.value.findIndex((item) => String(item.id) === String(mechanicId))

      if (index >= 0) {
        mechanics.value.splice(index, 1, mechanic)
      } else {
        mechanics.value = [...mechanics.value, mechanic]
      }

      return mechanic
    } finally {
      isMutating.value = false
    }
  }

  async function deleteMechanic(mechanicId: number | string) {
    isMutating.value = true

    try {
      await mechanicService.deleteMechanic(mechanicId)
      mechanics.value = mechanics.value.filter((mechanic) => String(mechanic.id) !== String(mechanicId))
    } finally {
      isMutating.value = false
    }
  }

  async function loadRepairDetail(repairId: number | string, options?: { silent?: boolean }) {
    const shouldShowLoading = !options?.silent

    if (shouldShowLoading) {
      isDetailLoading.value = true
    }

    try {
      const details = await repairService.getRepair(repairId, options)
      const comments = await repairService.getRepairComments(repairId, { silent: true }).catch(() => details.comments || [])
      currentRepairComments.value = comments
      currentRepair.value = {
        ...details,
        comments,
      }
      repairDetailsById.value = {
        ...repairDetailsById.value,
        [String(details.id)]: currentRepair.value,
      }
      repairCommentsById.value = {
        ...repairCommentsById.value,
        [String(details.id)]: comments,
      }
      upsertRepair(currentRepair.value)
      return currentRepair.value
    } finally {
      if (shouldShowLoading) {
        isDetailLoading.value = false
      }
    }
  }

  async function refreshCurrentRepair(options?: { silent?: boolean }) {
    if (!currentRepair.value) {
      return null
    }

    return loadRepairDetail(currentRepair.value.id, options)
  }

  function clearCurrentRepair() {
    currentRepair.value = null
    currentRepairComments.value = []
  }

  function updateRepairPhotos(repairId: number | string, photos: RepairPhoto[]) {
    const key = String(repairId)

    if (String(currentRepair.value?.id) === key && currentRepair.value) {
      currentRepair.value = {
        ...currentRepair.value,
        photos,
      }
      upsertRepair(currentRepair.value)
      return
    }

    if (repairDetailsById.value[key]) {
      repairDetailsById.value = {
        ...repairDetailsById.value,
        [key]: {
          ...repairDetailsById.value[key],
          photos,
        },
      }
    }
  }

  async function uploadRepairPhoto(repairId: number | string, file: File) {
    isPhotoMutating.value = true

    try {
      const photo = await repairService.uploadRepairPhoto(repairId, file)
      const currentPhotos = String(currentRepair.value?.id) === String(repairId)
        ? currentRepair.value?.photos || []
        : repairDetailsById.value[String(repairId)]?.photos || []
      updateRepairPhotos(repairId, [...currentPhotos, photo])
      return photo
    } finally {
      isPhotoMutating.value = false
    }
  }

  async function deleteRepairPhoto(repairId: number | string, photoId: number | string) {
    isPhotoMutating.value = true

    try {
      await repairService.deleteRepairPhoto(repairId, photoId)
      const currentPhotos = String(currentRepair.value?.id) === String(repairId)
        ? currentRepair.value?.photos || []
        : repairDetailsById.value[String(repairId)]?.photos || []
      updateRepairPhotos(repairId, currentPhotos.filter((photo) => String(photo.id) !== String(photoId)))
    } finally {
      isPhotoMutating.value = false
    }
  }

  async function createRepairWithFaults(payload: RepairPayload, faults: RepairFaultPayload[]) {
    isMutating.value = true

    try {
      const createdRepair = await repairService.createRepair(payload)

      for (const fault of faults) {
        const description = fault.description.trim()

        if (!description) {
          continue
        }

        await repairService.addRepairFault(createdRepair.id, {
          description,
          assignedMechanicId: fault.assignedMechanicId,
        })
      }

      await loadRepairs({ silent: true })
      return createdRepair
    } finally {
      isMutating.value = false
    }
  }

  async function updateRepair(repairId: number | string, payload: RepairUpdatePayload) {
    isMutating.value = true

    try {
      const updatedRepair = await repairService.updateRepair(repairId, payload)
      upsertRepair(updatedRepair)

      if (currentRepair.value?.id === updatedRepair.id) {
        await loadRepairDetail(updatedRepair.id, { silent: true })
      }

      return updatedRepair
    } finally {
      isMutating.value = false
    }
  }

  async function deleteRepair(repairId: number | string) {
    isMutating.value = true

    try {
      await repairService.deleteRepair(repairId)
      const key = String(repairId)
      repairs.value = repairs.value.filter((repair) => String(repair.id) !== String(repairId))
      weeks.value = weeks.value.map((week) => ({
        ...week,
        repairs: week.repairs.filter((repair) => String(repair.id) !== String(repairId)),
      }))
      fieldAndUnassigned.value = fieldAndUnassigned.value.filter((repair) => String(repair.id) !== String(repairId))
      delete repairDetailsById.value[key]
      delete repairCommentsById.value[key]

      if (String(currentRepair.value?.id) === String(repairId)) {
        clearCurrentRepair()
      }
    } finally {
      isMutating.value = false
    }
  }

  async function addRepairFault(repairId: number | string, payload: RepairFaultPayload) {
    isMutating.value = true

    try {
      const fault = await repairService.addRepairFault(repairId, payload)
      await loadRepairDetail(repairId, { silent: true })
      return fault
    } finally {
      isMutating.value = false
    }
  }

  async function updateRepairFault(repairId: number | string, faultId: number | string, payload: RepairFaultUpdatePayload) {
    isMutating.value = true

    try {
      const fault = await repairService.updateRepairFault(repairId, faultId, payload)
      await loadRepairDetail(repairId, { silent: true })
      return fault
    } finally {
      isMutating.value = false
    }
  }

  async function deleteRepairFault(repairId: number | string, faultId: number | string) {
    isMutating.value = true

    try {
      await repairService.deleteRepairFault(repairId, faultId)
      await loadRepairDetail(repairId, { silent: true })
    } finally {
      isMutating.value = false
    }
  }

  async function addRepairComment(repairId: number | string, text: string) {
    isMutating.value = true

    try {
      const comment = await repairService.addRepairComment(repairId, text)
      const key = String(repairId)
      const nextComments = [...(repairCommentsById.value[key] || currentRepairComments.value), comment]
      repairCommentsById.value = {
        ...repairCommentsById.value,
        [key]: nextComments,
      }
      currentRepairComments.value = nextComments

      if (currentRepair.value?.id === Number(repairId)) {
        currentRepair.value = {
          ...currentRepair.value,
          comments: nextComments,
        }
      }

      if (repairDetailsById.value[key]) {
        repairDetailsById.value = {
          ...repairDetailsById.value,
          [key]: {
            ...repairDetailsById.value[key],
            comments: nextComments,
          },
        }
      }

      return comment
    } finally {
      isMutating.value = false
    }
  }

  async function loadVehicleRepairHistory(vehicleId: number | string, options?: { silent?: boolean }) {
    const key = String(vehicleId)
    isVehicleRepairHistoryLoading.value = true

    try {
      const history = await repairService.getVehicleRepairHistory(vehicleId, options)
      vehicleRepairHistory.value = {
        ...vehicleRepairHistory.value,
        [key]: history,
      }
      repairDetailsById.value = history.reduce<Record<string, Repair>>((acc, repair) => {
        if (!repair.id) {
          return acc
        }

        const repairKey = String(repair.id)
        acc[repairKey] = {
          ...repairDetailsById.value[repairKey],
          ...repair,
          comments: repairDetailsById.value[repairKey]?.comments || repair.comments,
        }
        return acc
      }, { ...repairDetailsById.value })
      return history
    } finally {
      isVehicleRepairHistoryLoading.value = false
    }
  }

  return {
    repairs,
    weeks,
    fieldAndUnassigned,
    currentRepair,
    currentRepairComments,
    repairDetailsById,
    repairCommentsById,
    mechanics,
    places,
    vehicleRepairHistory,
    isLoading,
    isDetailLoading,
    isVehicleRepairHistoryLoading,
    isMutating,
    isPhotoMutating,
    repairById,
    loadRepairs,
    loadListData,
    loadDictionaries,
    createMechanic,
    updateMechanic,
    deleteMechanic,
    loadRepairDetail,
    refreshCurrentRepair,
    clearCurrentRepair,
    uploadRepairPhoto,
    deleteRepairPhoto,
    createRepairWithFaults,
    updateRepair,
    deleteRepair,
    addRepairFault,
    updateRepairFault,
    deleteRepairFault,
    addRepairComment,
    loadVehicleRepairHistory,
  }
})

export type { VehicleRepairHistoryItem }
