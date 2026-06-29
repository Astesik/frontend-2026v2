const GOOGLE_MAPS_SCRIPT_ID = 'routewise-google-maps-script'

declare global {
  interface Window {
    google?: any
    initRoutewiseGoogleMaps?: () => void
  }
}

let googleMapsPromise: Promise<any> | null = null

export function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google))
      existingScript.addEventListener('error', reject)
      return
    }

    window.initRoutewiseGoogleMaps = () => {
      resolve(window.google)
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initRoutewiseGoogleMaps`
    script.onerror = reject
    document.head.appendChild(script)
  })

  return googleMapsPromise
}
