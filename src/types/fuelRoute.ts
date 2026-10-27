import type { FuelStationPrice } from './fuelStation'
export interface RouteCoordinate { lat: number; lng: number }
export interface FuelRoutePoint { id: string; address: string; position: RouteCoordinate | null }
export interface FuelRouteSettings {
  providers: string[]; priceDate: string; corridorMeters: number; maxPriceAgeDays: number; priceType: 'FINAL' | 'BASE'; limit: number; consumptionDays: number; reservePercent: number; maxFuelAgeMinutes: number
}
export interface FuelRouteRequest extends Omit<FuelRouteSettings, 'priceDate'> { vehicleId: number; encodedPolyline: string; priceDate?: string }
export interface FuelRouteStation {
  active: boolean
  id: number; provider: string; stationCode: string; stationName: string; country: string; position: RouteCoordinate; price: FuelStationPrice | null; selectedPrice: number | null; priceAgeDays: number | null; eligibleForRanking: boolean; distanceFromRouteMeters: number; routeKm: number; nearestRoutePoint: RouteCoordinate; withinEstimatedFuelRange: boolean | null; detourChecked: boolean
}
export interface FuelCurrencyRanking { currency: string; stations: FuelRouteStation[] }
export interface FuelDailyReport { date: string; distanceKm: number | null; fuelUsedLiters: number | null; consumptionLPer100Km: number | null; sampleCount: number; usedForEstimate: boolean }
export interface FuelRangeEstimate {
  vehicleId: number; licensePlate: string; observedAt: string | null; tankLiters: number | null; percent: number | null; availableLiters: number | null; consumptionFrom: string; consumptionTo: string; dailyReports: FuelDailyReport[]; usableDays: number; consumptionLPer100Km: number | null; reservePercent: number; reserveLiters: number | null; safeRangeKm: number | null; rangeKm: number | null; reserveReachedPoint: RouteCoordinate | null; fuelRunsOutPoint: RouteCoordinate | null; canCompleteRoute: boolean | null; status: 'UNKNOWN' | 'ESTIMATED'
}
export interface FuelRouteResult {
  timezone: string; calculatedAt: string; priceDate: string; priceType: 'BASE' | 'FINAL'; corridorMeters: number; maxPriceAgeDays: number; routeDistanceKm: number; routePointCount: number; fuel: FuelRangeEstimate; routeZones: Array<{ color: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'; fromKm: number; toKm: number; path: RouteCoordinate[] }>; stations: FuelRouteStation[]; cheapestByCurrency: FuelCurrencyRanking[]; reachableCheapestByCurrency: FuelCurrencyRanking[]; detourChecked: boolean; warnings: string[]
}
export interface GoogleFuelRoute { path: RouteCoordinate[]; encodedPolyline: string; stops: RouteCoordinate[]; distanceKm: number; durationMinutes: number }
