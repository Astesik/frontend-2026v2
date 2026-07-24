import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { positionService } from '@/services/positionService'
import type { PositionHistoryRequest, PositionHistorySummary } from '@/services/positionService'
import { vehicleGroupService } from '@/services/vehicleGroupService'
import { vehicleService } from '@/services/vehicleService'
import type {
  ApiLastPosition,
  ApiVehicle,
  Driver,
  FleetAlert,
  GpsPosition,
  PositionDriver,
  Vehicle,
  VehicleAlertKind,
  VehicleGroup,
  VehicleGroupDetails,
  VehicleLifecycleAlert,
  VehicleStatus,
  VehicleType,
} from '@/types/fleet'

const SELECTED_VEHICLE_KEY = 'routewise.fleet.selectedVehicle'
const SELECTED_DRIVER_KEY = 'routewise.fleet.selectedDriver'
const MS_PER_DAY = 24 * 60 * 60 * 1000
const UPCOMING_ALERT_DAYS = 30
const TRUCKS_GROUP_ID = 'type:truck'
const TRAILERS_GROUP_ID = 'type:trailer'

function normalizeVehicleType(type: string | null): VehicleType {
  return type === 'TRAILER' ? 'trailer' : 'truck'
}

function normalizeDriverName(driver: PositionDriver | null) {
  if (!driver) {
    return null
  }

  const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim()
  return name || String(driver.tachoid)
}

function normalizeVehicleStatus(vehicle: ApiVehicle, position?: ApiLastPosition): VehicleStatus {
  if (vehicle.status && vehicle.status !== 'ACTIVE') {
    return 'service'
  }

  if (!position || position.lat === null || position.lon === null) {
    return 'offline'
  }

  if ((position.speedKph || 0) > 0) {
    return 'moving'
  }

  return 'idle'
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return 'Brak pozycji'
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return 'Brak pozycji'
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))

  if (seconds < 60) {
    return 'teraz'
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes} min temu`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} h temu`
  }

  return `${Math.floor(hours / 24)} dni temu`
}

function formatPositionTimestamp(value: string | null) {
  if (!value) {
    return 'Brak'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Brak'
  }

  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toUnixTimestampSeconds(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Nieprawidlowy zakres dat historii pozycji.')
  }

  return Math.floor(date.getTime() / 1000).toString()
}

function getTodayRouteRange(fromValue?: string | null): Pick<PositionHistoryRequest, 'from' | 'to'> {
  const from = fromValue ? new Date(fromValue) : new Date()

  if (!fromValue) {
    from.setHours(0, 0, 0, 0)
  }

  return {
    from: toUnixTimestampSeconds(from),
    to: toUnixTimestampSeconds(new Date()),
  }
}

function getPositionHistoryRange(from: Date | string, to: Date | string): Pick<PositionHistoryRequest, 'from' | 'to'> {
  return {
    from: toUnixTimestampSeconds(from),
    to: toUnixTimestampSeconds(to),
  }
}

function daysUntil(value: string | null) {
  const dueDate = parseDate(value)

  if (!dueDate) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.ceil((dueDate.getTime() - today.getTime()) / MS_PER_DAY)
}

function parseDate(value: string | null) {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  const isoDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const polishDateMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  if (polishDateMatch) {
    const [, day, month, year] = polishDateMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDaysDescription(daysLeft: number) {
  if (daysLeft < 0) {
    return `Termin przekroczony o ${Math.abs(daysLeft)} dni.`
  }

  if (daysLeft === 0) {
    return 'Termin przypada dzisiaj.'
  }

  return `Pozostalo ${daysLeft} dni.`
}

function createLifecycleAlert(kind: VehicleAlertKind, date: string | null): VehicleLifecycleAlert | null {
  const daysLeft = daysUntil(date)

  if (daysLeft === null || daysLeft >= UPCOMING_ALERT_DAYS) {
    return null
  }

  const title = kind === 'inspection' ? 'Przeglad techniczny' : 'Tachograf'

  return {
    kind,
    title,
    dueDate: date || '',
    daysLeft,
    description: formatDaysDescription(daysLeft),
  }
}

function normalizeVehicle(vehicle: ApiVehicle, position?: ApiLastPosition): Vehicle {
  const driver = position?.driver0 || position?.driver1 || null
  const driverName = normalizeDriverName(driver)
  const inspectionAlert = createLifecycleAlert('inspection', vehicle.technicalInspection)
  const tachographAlert = createLifecycleAlert('tachograph', vehicle.tachographInspection)
  const alerts = [inspectionAlert, tachographAlert].filter(Boolean) as VehicleLifecycleAlert[]
  const vehicleType = normalizeVehicleType(vehicle.type)
  const model = vehicle.make || vehicle.euroClass || (vehicleType === 'trailer' ? 'Naczepa' : 'Pojazd')
  const hasPosition = Boolean(position && position.lat !== null && position.lon !== null)

  return {
    id: String(vehicle.id),
    backendId: vehicle.id,
    name: vehicle.make ? `${vehicle.make} ${vehicle.licensePlate}` : vehicle.licensePlate,
    plateNumber: vehicle.licensePlate,
    model,
    make: vehicle.make,
    vin: vehicle.vin,
    productionYear: vehicle.productionYear,
    euroClass: vehicle.euroClass,
    vehicleType,
    rawType: vehicle.type,
    countryCode: position?.countryCode || 'PL',
    latitude: position?.lat ?? 0,
    longitude: position?.lon ?? 0,
    hasPosition,
    alertKind: alerts[0]?.kind,
    alerts,
    driverId: driver ? String(driver.tachoid) : undefined,
    driverName: driverName || undefined,
    driverTachographId: driver ? String(driver.tachoid) : undefined,
    status: normalizeVehicleStatus(vehicle, position),
    rawStatus: vehicle.status,
    speed: Math.round(position?.speedKph ?? 0),
    fuelLevel: Math.round(position?.fuelPct ?? 0),
    fuelPct: position?.fuelPct ?? null,
    fuelTank: vehicle.fuelTank ?? 0,
    lastUpdate: formatRelativeTime(position?.ts || vehicle.lastPositionAt),
    location: hasPosition
      ? `${position?.lat?.toFixed(5)}, ${position?.lon?.toFixed(5)}`
      : 'Brak aktualnej pozycji',
    technicalInspection: vehicle.technicalInspection,
    tachographInspection: vehicle.tachographInspection,
    vignetteUk: vehicle.vignetteUk,
    vignetteLuxembourg: vehicle.vignetteLuxembourg,
    vignetteDenmark: vehicle.vignetteDenmark,
    assignedDeviceId: vehicle.assignedDeviceId ?? null,
    ignitionState: position?.ignitionState || null,
    heading: position?.heading ?? null,
    lastPositionAt: vehicle.lastPositionAt,
    positionTimestamp: position?.ts || null,
  }
}

function normalizePosition(position: ApiLastPosition, vehicle?: ApiVehicle): GpsPosition | null {
  if (!position.vehicleId || position.lat === null || position.lon === null) {
    return null
  }

  const vehicleName = vehicle?.licensePlate || `Pojazd ${position.vehicleId}`

  return {
    id: `${position.deviceId}-${position.vehicleId}`,
    vehicleId: String(position.vehicleId),
    vehicleName,
    coordinates: `${position.lat.toFixed(5)}, ${position.lon.toFixed(5)}`,
    speed: Math.round(position.speedKph ?? 0),
    timestamp: formatPositionTimestamp(position.ts),
    address: position.countryCode ? `Kraj: ${position.countryCode}` : 'Pozycja GPS',
  }
}

export const useFleetStore = defineStore('fleet', () => {
  const apiVehicles = ref<ApiVehicle[]>([])
  const lastPositions = ref<ApiLastPosition[]>([])
  const currentPositionHistoryVehicleId = ref<string | null>(null)
  const currentPositionHistorySummary = ref<PositionHistorySummary | null>(null)
  const currentPositionHistoryRange = ref<{ from: string; to: string } | null>(null)
  const currentPositionHistoryMode = ref<'today' | 'custom' | null>(null)
  const vehicleGroups = ref<VehicleGroup[]>([])
  const vehicleGroupDetails = ref<Record<string, VehicleGroupDetails>>({})
  const isVehiclesLoading = ref(false)
  const isVehicleGroupsLoading = ref(false)
  const isPositionsLoading = ref(false)
  const isRouteHistoryLoading = ref(false)
  const selectedVehicleId = ref<string>(localStorage.getItem(SELECTED_VEHICLE_KEY) || 'all')
  const selectedDriverId = ref<string>(localStorage.getItem(SELECTED_DRIVER_KEY) || 'all')
  let currentPositionHistoryRequestId = 0

  const vehicleById = computed(() => new Map(apiVehicles.value.map((vehicle) => [String(vehicle.id), vehicle])))

  const positionByVehicleId = computed(() => {
    const positions = new Map<string, ApiLastPosition>()

    lastPositions.value.forEach((position) => {
      if (position.vehicleId) {
        positions.set(String(position.vehicleId), position)
      }
    })

    return positions
  })

  const vehicles = computed(() => apiVehicles.value.map((vehicle) => (
    normalizeVehicle(vehicle, positionByVehicleId.value.get(String(vehicle.id)))
  )))

  const vehicleTypeGroups = computed<VehicleGroup[]>(() => [
    {
      id: TRUCKS_GROUP_ID,
      name: 'Ciągniki',
      vehiclesCount: vehicles.value.filter((vehicle) => vehicle.vehicleType === 'truck').length,
    },
    {
      id: TRAILERS_GROUP_ID,
      name: 'Naczepy',
      vehiclesCount: vehicles.value.filter((vehicle) => vehicle.vehicleType === 'trailer').length,
    },
  ])

  const drivers = computed<Driver[]>(() => {
    const driversById = new Map<string, Driver>()

    lastPositions.value.forEach((position) => {
      const vehicleId = position.vehicleId ? String(position.vehicleId) : undefined

      ;[position.driver0, position.driver1].forEach((driver) => {
        if (!driver) {
          return
        }

        const id = String(driver.tachoid)

        if (!driversById.has(id)) {
          driversById.set(id, {
            id,
            name: normalizeDriverName(driver) || id,
            phone: '',
            status: position.ignitionState === 'ON' ? 'route' : 'available',
            assignedVehicleId: vehicleId,
            tachographId: id,
          })
        }
      })
    })

    return Array.from(driversById.values())
  })

  const positions = computed<GpsPosition[]>(() => lastPositions.value
    .map((position) => normalizePosition(position, position.vehicleId ? vehicleById.value.get(String(position.vehicleId)) : undefined))
    .filter(Boolean) as GpsPosition[])

  const alerts = computed<FleetAlert[]>(() => vehicles.value.flatMap((vehicle) => vehicle.alerts.map((alert) => ({
    id: `${vehicle.id}-${alert.kind}`,
    type: alert.daysLeft < 0 ? 'error' : 'warning',
    title: `${alert.title}: ${vehicle.plateNumber}`,
    description: alert.description,
    timestamp: alert.dueDate,
  }))))

  const vehicleOptions = computed(() => vehicles.value.map((vehicle) => ({
    id: vehicle.id,
    label: vehicle.plateNumber,
  })))

  const driverOptions = computed(() => drivers.value.map((driver) => ({
    id: driver.id,
    label: driver.name,
  })))

  const selectedVehicle = computed(() => vehicles.value.find((vehicle) => vehicle.id === selectedVehicleId.value) || null)
  const selectedDriver = computed(() => drivers.value.find((driver) => driver.id === selectedDriverId.value) || null)

  const fleetStats = computed(() => ({
    total: vehicles.value.length,
    moving: vehicles.value.filter((vehicle) => vehicle.status === 'moving').length,
    idle: vehicles.value.filter((vehicle) => vehicle.status === 'idle').length,
    offline: vehicles.value.filter((vehicle) => vehicle.status === 'offline').length,
    alerts: alerts.value.length,
  }))

  async function fetchVehicles(options?: { silent?: boolean }) {
    isVehiclesLoading.value = true

    try {
      apiVehicles.value = await vehicleService.getVehicles(options)
    } finally {
      isVehiclesLoading.value = false
    }
  }

  async function fetchVehicleGroups(options?: { silent?: boolean }) {
    isVehicleGroupsLoading.value = true

    try {
      vehicleGroups.value = await vehicleGroupService.getVehicleGroups(options)
    } finally {
      isVehicleGroupsLoading.value = false
    }
  }

  async function fetchVehicleGroup(groupId: string, options?: { silent?: boolean }) {
    if (groupId === 'all' || groupId === TRUCKS_GROUP_ID || groupId === TRAILERS_GROUP_ID || vehicleGroupDetails.value[groupId]) {
      return vehicleGroupDetails.value[groupId] || null
    }

    const group = await vehicleGroupService.getVehicleGroup(groupId, options)
    vehicleGroupDetails.value = {
      ...vehicleGroupDetails.value,
      [group.id]: group,
    }

    return group
  }

  function upsertVehicleGroupDetails(group: VehicleGroupDetails) {
    vehicleGroupDetails.value = {
      ...vehicleGroupDetails.value,
      [group.id]: group,
    }

    const index = vehicleGroups.value.findIndex((item) => item.id === group.id)
    const listItem: VehicleGroup = {
      id: group.id,
      name: group.name,
      vehiclesCount: group.vehicleIds.length,
    }

    if (index >= 0) {
      vehicleGroups.value.splice(index, 1, listItem)
    } else {
      vehicleGroups.value = [...vehicleGroups.value, listItem]
    }
  }

  async function createVehicleGroup(name: string) {
    const group = await vehicleGroupService.createVehicleGroup({ name })
    upsertVehicleGroupDetails(group)
    return group
  }

  async function updateVehicleGroupName(groupId: string, name: string) {
    const group = await vehicleGroupService.updateVehicleGroup(groupId, { name })
    upsertVehicleGroupDetails(group)
    return group
  }

  async function deleteVehicleGroup(groupId: string) {
    await vehicleGroupService.deleteVehicleGroup(groupId)
    vehicleGroups.value = vehicleGroups.value.filter((group) => group.id !== groupId)
    const nextDetails = { ...vehicleGroupDetails.value }
    delete nextDetails[groupId]
    vehicleGroupDetails.value = nextDetails
  }

  async function addVehicleToVehicleGroup(groupId: string, vehicleId: string | number) {
    const group = await vehicleGroupService.addVehicleToGroup(groupId, vehicleId)
    upsertVehicleGroupDetails(group)
    return group
  }

  async function removeVehicleFromVehicleGroup(groupId: string, vehicleId: string | number) {
    const group = await vehicleGroupService.removeVehicleFromGroup(groupId, vehicleId)
    upsertVehicleGroupDetails(group)
    return group
  }

  async function fetchLastPositions(options?: { silent?: boolean }) {
    isPositionsLoading.value = true

    try {
      lastPositions.value = await positionService.getLastPositions(options)
    } finally {
      isPositionsLoading.value = false
    }
  }

  function clearPositionHistory() {
    currentPositionHistoryRequestId += 1
    currentPositionHistoryVehicleId.value = null
    currentPositionHistorySummary.value = null
    currentPositionHistoryRange.value = null
    currentPositionHistoryMode.value = null
    isRouteHistoryLoading.value = false
  }

  async function fetchTodayRouteHistory(vehicle: Vehicle, options?: { silent?: boolean }) {
    clearPositionHistory()

    if (!vehicle.assignedDeviceId) {
      return []
    }

    const requestId = currentPositionHistoryRequestId
    currentPositionHistoryVehicleId.value = vehicle.id
    currentPositionHistoryMode.value = 'today'
    isRouteHistoryLoading.value = true
    const range = getTodayRouteRange()
    currentPositionHistoryRange.value = range

    try {
      const { result: points, summary } = await positionService.getPositionHistory({
        device_id: vehicle.assignedDeviceId,
        from: range.from,
        to: range.to,
      }, options)

      if (currentPositionHistoryRequestId === requestId && currentPositionHistoryVehicleId.value === vehicle.id) {
        currentPositionHistorySummary.value = summary
      }

      return points
    } finally {
      if (currentPositionHistoryRequestId === requestId) {
        isRouteHistoryLoading.value = false
      }
    }
  }

  async function appendTodayRouteHistory(
    vehicle: Vehicle,
    fromValue: string | null,
    options?: { silent?: boolean },
  ) {
    if (
      currentPositionHistoryMode.value !== 'today' ||
      currentPositionHistoryVehicleId.value !== vehicle.id ||
      !fromValue
    ) {
      return fetchTodayRouteHistory(vehicle, options)
    }

    if (!vehicle.assignedDeviceId) {
      return []
    }

    const requestId = currentPositionHistoryRequestId
    isRouteHistoryLoading.value = true
    const range = getTodayRouteRange(fromValue)

    try {
      const { result: points, summary } = await positionService.getPositionHistory({
        device_id: vehicle.assignedDeviceId,
        from: range.from,
        to: range.to,
      }, options)

      if (currentPositionHistoryRequestId === requestId && currentPositionHistoryVehicleId.value === vehicle.id) {
        currentPositionHistorySummary.value = summary
        currentPositionHistoryRange.value = {
          from: currentPositionHistoryRange.value?.from || getTodayRouteRange().from,
          to: range.to,
        }
      }

      return points
    } finally {
      if (currentPositionHistoryRequestId === requestId) {
        isRouteHistoryLoading.value = false
      }
    }
  }

  async function fetchPositionHistory(
    vehicle: Vehicle,
    from: Date | string,
    to: Date | string,
    options?: { silent?: boolean },
  ) {
    clearPositionHistory()

    if (!vehicle.assignedDeviceId) {
      return []
    }

    const requestId = currentPositionHistoryRequestId
    const range = getPositionHistoryRange(from, to)
    const payload: PositionHistoryRequest = {
      ...range,
      device_id: vehicle.assignedDeviceId,
    }

    currentPositionHistoryVehicleId.value = vehicle.id
    currentPositionHistoryMode.value = 'custom'
    currentPositionHistoryRange.value = range
    isRouteHistoryLoading.value = true

    try {
      const { result: points, summary } = await positionService.getPositionHistory(payload, options)

      if (currentPositionHistoryRequestId === requestId && currentPositionHistoryVehicleId.value === vehicle.id) {
        currentPositionHistorySummary.value = summary
      }

      return points
    } finally {
      if (currentPositionHistoryRequestId === requestId) {
        isRouteHistoryLoading.value = false
      }
    }
  }

  async function loadFleetData(options?: { silent?: boolean }) {
    await Promise.allSettled([
      fetchVehicles(options),
      fetchVehicleGroups(options),
      fetchLastPositions(options),
    ])
  }

  function isVehicleInGroup(groupId: string, vehicleId: string) {
    if (groupId === 'all') {
      return true
    }

    if (groupId === TRUCKS_GROUP_ID || groupId === TRAILERS_GROUP_ID) {
      const expectedType = groupId === TRUCKS_GROUP_ID ? 'truck' : 'trailer'
      return vehicles.value.some((vehicle) => vehicle.id === vehicleId && vehicle.vehicleType === expectedType)
    }

    return vehicleGroupDetails.value[groupId]?.vehicleIds.includes(vehicleId) || false
  }

  function getVehicleIdsForGroup(groupId: string) {
    if (groupId === TRUCKS_GROUP_ID || groupId === TRAILERS_GROUP_ID) {
      const expectedType = groupId === TRUCKS_GROUP_ID ? 'truck' : 'trailer'
      return vehicles.value.filter((vehicle) => vehicle.vehicleType === expectedType).map((vehicle) => vehicle.id)
    }

    return vehicleGroupDetails.value[groupId]?.vehicleIds || []
  }

  function setSelectedVehicle(vehicleId: string) {
    selectedVehicleId.value = vehicleId
    localStorage.setItem(SELECTED_VEHICLE_KEY, vehicleId)
  }

  function setSelectedDriver(driverId: string) {
    selectedDriverId.value = driverId
    localStorage.setItem(SELECTED_DRIVER_KEY, driverId)
  }

  function resetApiState() {
    apiVehicles.value = []
    lastPositions.value = []
    vehicleGroups.value = []
    vehicleGroupDetails.value = {}
    isVehiclesLoading.value = false
    isVehicleGroupsLoading.value = false
    isPositionsLoading.value = false
    clearPositionHistory()
  }

  return {
    apiVehicles,
    lastPositions,
    currentPositionHistoryVehicleId,
    currentPositionHistorySummary,
    currentPositionHistoryRange,
    currentPositionHistoryMode,
    vehicles,
    drivers,
    positions,
    alerts,
    vehicleGroups,
    vehicleTypeGroups,
    vehicleGroupDetails,
    isVehiclesLoading,
    isVehicleGroupsLoading,
    isPositionsLoading,
    isRouteHistoryLoading,
    selectedVehicleId,
    selectedDriverId,
    vehicleOptions,
    driverOptions,
    selectedVehicle,
    selectedDriver,
    fleetStats,
    fetchVehicles,
    fetchVehicleGroups,
    fetchVehicleGroup,
    createVehicleGroup,
    updateVehicleGroupName,
    deleteVehicleGroup,
    addVehicleToVehicleGroup,
    removeVehicleFromVehicleGroup,
    fetchLastPositions,
    fetchTodayRouteHistory,
    appendTodayRouteHistory,
    fetchPositionHistory,
    clearPositionHistory,
    loadFleetData,
    isVehicleInGroup,
    getVehicleIdsForGroup,
    setSelectedVehicle,
    setSelectedDriver,
    resetApiState,
  }
})
