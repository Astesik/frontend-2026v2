import { loadGoogleMaps } from './googleMapsLoader'
import type { FuelRoutePoint, GoogleFuelRoute, RouteCoordinate } from '@/types/fuelRoute'
export const googleFuelRouteService = {
  async calculate(origin: RouteCoordinate, points: FuelRoutePoint[]): Promise<GoogleFuelRoute> {
    const google = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')
    const [{ Route }, { encoding }] = await Promise.all([google.maps.importLibrary('routes'), google.maps.importLibrary('geometry')])
    const destinations = points.map(p => p.position || p.address.trim())
    const { routes } = await Route.computeRoutes({ origin, destination: destinations.at(-1), intermediates: destinations.slice(0, -1).map(location => ({ location })), travelMode: 'DRIVING', routingPreference: 'TRAFFIC_UNAWARE', polylineQuality: 'HIGH_QUALITY', fields: ['path', 'legs', 'distanceMeters', 'durationMillis'] })
    const route = routes?.[0]
    if (!route?.path?.length) throw new Error('Google Maps nie znalazło trasy dla podanych punktów.')
    const path = route.path.map((p: RouteCoordinate) => ({ lat: p.lat, lng: p.lng }))
    if (path.length < 2 || path.length > 10000) throw new Error('Trasa przekracza limit punktów. Podziel ją na krótsze odcinki.')
    const encodedPolyline = encoding.encodePath(path.map((p: RouteCoordinate) => new google.maps.LatLng(p.lat, p.lng)))
    if (encodedPolyline.length > 200000) throw new Error('Geometria trasy jest zbyt duża. Wybierz krótszą trasę.')
    return { path, encodedPolyline, stops: (route.legs || []).map((leg: any) => leg.endLocation).filter(Boolean).map((p: RouteCoordinate) => ({ lat: p.lat, lng: p.lng })), distanceKm: (route.distanceMeters || 0) / 1000, durationMinutes: (route.durationMillis || 0) / 60000 }
  },
}
