import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type TripSection = 'base' | 'other' | 'field'
export type TripActivityType = 'rest' | 'drive' | 'work'
export type TripStationStatus = 'sent' | 'not_sent'

export interface TripRoutePoint {
  lat: number
  lng: number
}

export interface TripFuelStop extends TripRoutePoint {
  id: number
  place: string
  liters: number
  timestamp: string
}

export interface TripActivity {
  type: TripActivityType
  startHour: number
  endHour: number
}

export interface TripActivityDay {
  date: string
  activities: TripActivity[]
}

export interface DriverTrip {
  id: number
  section: TripSection
  vehiclePlate: string
  trailerPlate: string | null
  driverName: string
  departureDate: string
  returnDate: string | null
  averageFuelConsumption: number
  fuelCardAverageConsumption: number
  distanceKm: number
  averageSpeedKph: number
  weeklyDrivingHours: number
  biweeklyDrivingHours: number
  route: TripRoutePoint[]
  fuelStops: TripFuelStop[]
  activityDays: TripActivityDay[]
  departureStationStatus: TripStationStatus
  returnStationStatus: TripStationStatus
}

const MOCK_TRIPS: DriverTrip[] = [
  {
    id: 1,
    section: 'field',
    vehiclePlate: 'WGM1178N',
    trailerPlate: 'EWI1XK6',
    driverName: 'Jan Kowalski',
    departureDate: '2026-09-01T05:40:00Z',
    returnDate: null,
    averageFuelConsumption: 27.8,
    fuelCardAverageConsumption: 28.3,
    distanceKm: 2846,
    averageSpeedKph: 68,
    weeklyDrivingHours: 41.4,
    biweeklyDrivingHours: 79.2,
    route: [
      { lat: 52.2297, lng: 21.0122 },
      { lat: 52.0692, lng: 19.4803 },
      { lat: 51.7592, lng: 19.456 },
      { lat: 51.1079, lng: 17.0385 },
      { lat: 51.0504, lng: 13.7373 },
      { lat: 50.1109, lng: 8.6821 },
      { lat: 50.9375, lng: 6.9603 },
    ],
    fuelStops: [
      { id: 1, lat: 51.7592, lng: 19.456, place: 'Łódź', liters: 412, timestamp: '2026-08-27T09:20:00Z' },
      { id: 2, lat: 50.1109, lng: 8.6821, place: 'Frankfurt nad Menem', liters: 356, timestamp: '2026-08-29T16:10:00Z' },
    ],
    activityDays: [
      { date: '2026-08-27', activities: [{ type: 'rest', startHour: 0, endHour: 5.5 }, { type: 'work', startHour: 5.5, endHour: 6.2 }, { type: 'drive', startHour: 6.2, endHour: 10.5 }, { type: 'rest', startHour: 10.5, endHour: 11.25 }, { type: 'drive', startHour: 11.25, endHour: 15.5 }, { type: 'work', startHour: 15.5, endHour: 16.3 }, { type: 'rest', startHour: 16.3, endHour: 24 }] },
      { date: '2026-08-28', activities: [{ type: 'rest', startHour: 0, endHour: 6 }, { type: 'work', startHour: 6, endHour: 6.5 }, { type: 'drive', startHour: 6.5, endHour: 11 }, { type: 'rest', startHour: 11, endHour: 11.75 }, { type: 'drive', startHour: 11.75, endHour: 16 }, { type: 'work', startHour: 16, endHour: 17 }, { type: 'rest', startHour: 17, endHour: 24 }] },
      { date: '2026-08-29', activities: [{ type: 'rest', startHour: 0, endHour: 7 }, { type: 'drive', startHour: 7, endHour: 11.3 }, { type: 'rest', startHour: 11.3, endHour: 12.05 }, { type: 'drive', startHour: 12.05, endHour: 16.3 }, { type: 'work', startHour: 16.3, endHour: 17.2 }, { type: 'rest', startHour: 17.2, endHour: 24 }] },
      { date: '2026-08-30', activities: [{ type: 'rest', startHour: 0, endHour: 8 }, { type: 'work', startHour: 8, endHour: 8.7 }, { type: 'drive', startHour: 8.7, endHour: 13 }, { type: 'rest', startHour: 13, endHour: 13.75 }, { type: 'drive', startHour: 13.75, endHour: 17.8 }, { type: 'rest', startHour: 17.8, endHour: 24 }] },
      { date: '2026-08-31', activities: [{ type: 'rest', startHour: 0, endHour: 6.5 }, { type: 'drive', startHour: 6.5, endHour: 10.7 }, { type: 'work', startHour: 10.7, endHour: 11.4 }, { type: 'rest', startHour: 11.4, endHour: 12.2 }, { type: 'drive', startHour: 12.2, endHour: 16.1 }, { type: 'rest', startHour: 16.1, endHour: 24 }] },
    ],
    departureStationStatus: 'sent',
    returnStationStatus: 'not_sent',
  },
  {
    id: 2,
    section: 'base',
    vehiclePlate: 'FZ1851N',
    trailerPlate: 'EWI1XK8',
    driverName: 'Piotr Nowak',
    departureDate: '2026-08-31T06:15:00Z',
    returnDate: '2026-08-25T17:35:00Z',
    averageFuelConsumption: 29.2,
    fuelCardAverageConsumption: 29.8,
    distanceKm: 1984,
    averageSpeedKph: 64,
    weeklyDrivingHours: 38.6,
    biweeklyDrivingHours: 74.1,
    route: [{ lat: 52.2297, lng: 21.0122 }, { lat: 51.1079, lng: 17.0385 }, { lat: 50.0647, lng: 19.945 }, { lat: 49.8397, lng: 24.0297 }],
    fuelStops: [{ id: 3, lat: 50.0647, lng: 19.945, place: 'Kraków', liters: 386, timestamp: '2026-08-21T12:30:00Z' }],
    activityDays: [],
    departureStationStatus: 'sent',
    returnStationStatus: 'sent',
  },
  {
    id: 3,
    section: 'other',
    vehiclePlate: 'WGM6367J',
    trailerPlate: null,
    driverName: 'Oleksandr Humeniuk',
    departureDate: '2026-08-12T04:50:00Z',
    returnDate: '2026-08-20T19:10:00Z',
    averageFuelConsumption: 26.9,
    fuelCardAverageConsumption: 27.4,
    distanceKm: 3218,
    averageSpeedKph: 71,
    weeklyDrivingHours: 43.2,
    biweeklyDrivingHours: 82.7,
    route: [{ lat: 52.2297, lng: 21.0122 }, { lat: 52.4064, lng: 16.9252 }, { lat: 52.52, lng: 13.405 }, { lat: 53.5511, lng: 9.9937 }],
    fuelStops: [{ id: 4, lat: 52.4064, lng: 16.9252, place: 'Poznań', liters: 421, timestamp: '2026-08-13T08:45:00Z' }],
    activityDays: [],
    departureStationStatus: 'sent',
    returnStationStatus: 'sent',
  },
  {
    id: 4,
    section: 'field',
    vehiclePlate: 'FZ3856P',
    trailerPlate: 'EWI1XK9',
    driverName: 'Marek Wiśniewski',
    departureDate: '2026-09-01T03:30:00Z',
    returnDate: null,
    averageFuelConsumption: 28.4,
    fuelCardAverageConsumption: 28.9,
    distanceKm: 1126,
    averageSpeedKph: 66,
    weeklyDrivingHours: 22.8,
    biweeklyDrivingHours: 61.3,
    route: [{ lat: 52.2297, lng: 21.0122 }, { lat: 51.7592, lng: 19.456 }, { lat: 50.2649, lng: 19.0238 }, { lat: 49.1951, lng: 16.6068 }],
    fuelStops: [],
    activityDays: [],
    departureStationStatus: 'sent',
    returnStationStatus: 'not_sent',
  },
]

export const useTripStore = defineStore('trips', () => {
  const trips = ref<DriverTrip[]>(MOCK_TRIPS)
  const searchQuery = ref('')
  const selectedWeekStart = ref(startOfWeekIso(new Date()))

  const filteredTrips = computed(() => {
    const query = searchQuery.value.trim().toLocaleLowerCase('pl-PL')
    const weekStart = new Date(`${selectedWeekStart.value}T00:00:00`)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    return trips.value.filter((trip) => (
      new Date(trip.departureDate) >= weekStart &&
      new Date(trip.departureDate) < weekEnd &&
      (!query || [trip.vehiclePlate, trip.trailerPlate, trip.driverName].some((value) => value?.toLocaleLowerCase('pl-PL').includes(query)))
    ))
  })

  function tripById(id: number | string) {
    return trips.value.find((trip) => String(trip.id) === String(id)) || null
  }

  function updateStationStatus(tripId: number, field: 'departureStationStatus' | 'returnStationStatus', status: TripStationStatus) {
    const trip = trips.value.find((item) => item.id === tripId)
    if (trip) trip[field] = status
  }

  return { trips, searchQuery, selectedWeekStart, filteredTrips, tripById, updateStationStatus }
})

function startOfWeekIso(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}
