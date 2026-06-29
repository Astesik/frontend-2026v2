const HERE_GEOCODE_URL = 'https://geocode.search.hereapi.com/v1/geocode'
const HERE_AUTOSUGGEST_URL = 'https://autosuggest.search.hereapi.com/v1/autosuggest'
const HERE_ROUTING_URL = 'https://router.hereapi.com/v8/routes'
const EXCLUDED_TOLL_COUNTRY_CODES = new Set(['GB', 'GBR', 'UK', 'NL', 'NLD', 'LU', 'LUX'])
const ALWAYS_AVOID_COUNTRY_CODES = ['CHE']
const SWITZERLAND_AVOID_AREA = 'bbox:5.9559,45.8179,10.4921,47.8085'

export interface HereCoordinate {
  lat: number
  lng: number
  label?: string
  countryCode?: string | null
}

export interface HereRoutePoint {
  label: string
  query: string
  coordinates?: HereCoordinate
}

export interface HereAutosuggestItem {
  id: string
  title: string
  addressLabel: string
  countryCode: string | null
  coordinates: HereCoordinate
  raw: any
}

export interface HereDebugPayload {
  title: string
  url: string
  request?: unknown
  response?: unknown
  error?: unknown
}

export type HereDebugLogger = (payload: HereDebugPayload) => void

export interface HereRouteRequest {
  apiKey: string
  origin: HereCoordinate | string
  stops: HereRoutePoint[]
  onDebug?: HereDebugLogger
}

export interface HereRouteOption {
  id: string
  sections: any[]
  lengthMeters: number
  durationSeconds: number
  polylineSections: string[]
  tollAmountEur: number
  countryTolls: HereCountryToll[]
}

export interface HereCountryToll {
  countryCode: string
  amount: number
  currency: string
}

export interface HereRouteResult {
  raw: any
  routes: HereRouteOption[]
  resolvedOrigin: HereCoordinate
  resolvedStops: Array<HereRoutePoint & { coordinates: HereCoordinate }>
}

function coordinateToParam(coordinate: HereCoordinate) {
  return `${coordinate.lat},${coordinate.lng}`
}

function isCoordinate(value: HereCoordinate | string): value is HereCoordinate {
  return typeof value !== 'string'
}

function parseCoordinateQuery(value: string): HereCoordinate | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)

  if (!match) {
    return null
  }

  return {
    lat: Number(match[1]),
    lng: Number(match[2]),
    label: value.trim(),
  }
}

function sanitizedUrl(url: URL) {
  const nextUrl = new URL(url.toString())
  if (nextUrl.searchParams.has('apiKey')) {
    nextUrl.searchParams.set('apiKey', '***')
  }

  return nextUrl.toString()
}

function sanitizedRequestParams(url: URL) {
  const params: Record<string, string | string[]> = {}

  url.searchParams.forEach((value, key) => {
    const nextValue = key === 'apiKey' ? '***' : value

    if (key in params) {
      const current = params[key]
      params[key] = Array.isArray(current) ? [...current, nextValue] : [current, nextValue]
      return
    }

    params[key] = nextValue
  })

  return params
}

async function requestJson<T>(url: URL, title: string, onDebug?: HereDebugLogger): Promise<T> {
  const safeUrl = sanitizedUrl(url)
  const request = sanitizedRequestParams(url)

  try {
    const response = await fetch(url.toString())
    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    onDebug?.({
      title,
      url: safeUrl,
      request,
      response: {
        status: response.status,
        ok: response.ok,
        data,
      },
    })

    if (!response.ok) {
      throw new Error(`HERE API ${response.status}`)
    }

    return data as T
  } catch (error) {
    onDebug?.({
      title,
      url: safeUrl,
      request,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function geocodeHereLocation(query: string, apiKey: string, onDebug?: HereDebugLogger): Promise<HereCoordinate> {
  const parsedCoordinates = parseCoordinateQuery(query)

  if (parsedCoordinates) {
    return parsedCoordinates
  }

  const url = new URL(HERE_GEOCODE_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')
  url.searchParams.set('apiKey', apiKey)

  const data = await requestJson<{ items?: Array<{ title?: string; address?: { countryCode?: string }; position?: { lat?: number; lng?: number } }> }>(
    url,
    'HERE Geocoding',
    onDebug,
  )
  const item = data.items?.[0]

  if (!item?.position || typeof item.position.lat !== 'number' || typeof item.position.lng !== 'number') {
    throw new Error(`Nie znaleziono lokalizacji: ${query}`)
  }

  return {
    lat: item.position.lat,
    lng: item.position.lng,
    label: item.title || query,
    countryCode: item.address?.countryCode || null,
  }
}

export async function autosuggestHereLocations(query: string, apiKey: string, options?: { at?: HereCoordinate; onDebug?: HereDebugLogger }) {
  const url = new URL(HERE_AUTOSUGGEST_URL)
  const searchCenter = options?.at || { lat: 52.1, lng: 19.4 }

  url.searchParams.set('q', query)
  url.searchParams.set('limit', '6')
  url.searchParams.set('at', coordinateToParam(searchCenter))
  url.searchParams.set('apiKey', apiKey)

  const data = await requestJson<{ items?: any[] }>(url, 'HERE Autosuggest', options?.onDebug)

  return (data.items || [])
    .filter((item) => item.position && typeof item.position.lat === 'number' && typeof item.position.lng === 'number')
    .map((item, index) => {
      const countryCode = item.address?.countryCode || item.countryCode || null

      return {
        id: String(item.id || `${item.title}-${index}`),
        title: String(item.title || item.address?.label || 'Lokalizacja'),
        addressLabel: String(item.address?.label || item.vicinity || item.title || ''),
        countryCode,
        coordinates: {
          lat: item.position.lat,
          lng: item.position.lng,
          label: item.title || item.address?.label,
          countryCode,
        },
        raw: item,
      }
    }) as HereAutosuggestItem[]
}

function findCountryCode(value: any): string {
  if (!value || typeof value !== 'object') {
    return 'N/A'
  }

  if (typeof value.countryCode === 'string') {
    return value.countryCode
  }

  if (typeof value.country === 'string') {
    return value.country
  }

  if (value.country && typeof value.country === 'object') {
    return findCountryCode(value.country)
  }

  if (value.location && typeof value.location === 'object') {
    return findCountryCode(value.location)
  }

  return 'N/A'
}

function readTollAmount(fare: any) {
  const price = fare?.convertedPrice || fare?.price
  const amount = Number(price?.value ?? fare?.value ?? 0)
  const currency = String(price?.currency || fare?.currency || 'EUR').toUpperCase()

  return {
    amount: Number.isFinite(amount) ? amount : 0,
    currency,
  }
}

function collectTollsByCountry(sections: any[]) {
  const tollsByCountry = new Map<string, HereCountryToll>()

  sections.forEach((section) => {
    ;(section.tolls || []).forEach((toll: any) => {
      const countryCode = findCountryCode(toll)

      ;(toll.fares || []).forEach((fare: any) => {
        const { amount, currency } = readTollAmount(fare)

        if (!amount) {
          return
        }

        const key = `${countryCode}:${currency}`
        const current = tollsByCountry.get(key)

        tollsByCountry.set(key, {
          countryCode,
          currency,
          amount: (current?.amount || 0) + amount,
        })
      })
    })
  })

  return Array.from(tollsByCountry.values()).sort((first, second) => (
    first.countryCode.localeCompare(second.countryCode)
  ))
}

function isIncludedTollCountry(countryCode: string) {
  return !EXCLUDED_TOLL_COUNTRY_CODES.has(countryCode.toUpperCase())
}

export async function calculateHereRoute(request: HereRouteRequest): Promise<HereRouteResult> {
  const resolvedOrigin = isCoordinate(request.origin)
    ? request.origin
    : await geocodeHereLocation(request.origin, request.apiKey, request.onDebug)

  const resolvedStops = []

  for (const stop of request.stops) {
    resolvedStops.push({
      ...stop,
      coordinates: stop.coordinates || await geocodeHereLocation(stop.query, request.apiKey, request.onDebug),
    })
  }

  if (!resolvedStops.length) {
    throw new Error('Dodaj przynajmniej jeden punkt trasy.')
  }

  const url = new URL(HERE_ROUTING_URL)
  url.searchParams.set('transportMode', 'truck')
  url.searchParams.set('origin', coordinateToParam(resolvedOrigin))
  url.searchParams.set('destination', coordinateToParam(resolvedStops.at(-1)!.coordinates))
  url.searchParams.set('return', 'summary,polyline,tolls')
  url.searchParams.set('currency', 'EUR')
  url.searchParams.set('alternatives', '3')
  url.searchParams.set('avoid[countries]', ALWAYS_AVOID_COUNTRY_CODES.join(','))
  url.searchParams.set('avoid[areas]', SWITZERLAND_AVOID_AREA)
  url.searchParams.set('vehicle[length]', '1650')
  url.searchParams.set('vehicle[width]', '250')
  url.searchParams.set('vehicle[height]', '400')
  url.searchParams.set('vehicle[grossWeight]', '40000')
  url.searchParams.set('apiKey', request.apiKey)

  resolvedStops.slice(0, -1).forEach((stop) => {
    url.searchParams.append('via', coordinateToParam(stop.coordinates))
  })

  const raw = await requestJson<{ routes?: Array<{ id?: string; sections?: any[] }> }>(
    url,
    'HERE Routing API v8',
    request.onDebug,
  )
  const routes = raw.routes || []

  if (!routes.length) {
    throw new Error('HERE nie zwrocilo trasy.')
  }

  return {
    raw,
    routes: routes.map((route, index) => {
      const sections = route.sections || []
      const countryTolls = collectTollsByCountry(sections).filter((item) => isIncludedTollCountry(item.countryCode))
      const tollAmountEur = countryTolls
        .filter((item) => item.currency === 'EUR')
        .reduce((sum, item) => sum + item.amount, 0)

      return {
        id: route.id || `route-${index + 1}`,
        sections,
        lengthMeters: sections.reduce((sum, section) => sum + Number(section.summary?.length || 0), 0),
        durationSeconds: sections.reduce((sum, section) => sum + Number(section.summary?.duration || 0), 0),
        polylineSections: sections.map((section) => section.polyline).filter(Boolean),
        tollAmountEur,
        countryTolls,
      }
    }),
    resolvedOrigin,
    resolvedStops,
  }
}
