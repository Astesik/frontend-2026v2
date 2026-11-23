const GOOGLE_MAPS_SCRIPT_ID = 'routewise-google-maps-script'

declare global {
  interface Window {
    google?: any
    initRoutewiseGoogleMaps?: () => void
  }
}

let googleMapsPromise: Promise<any> | null = null

export function loadGoogleMaps(apiKey: string) {
  if (typeof window.google?.maps?.Map === 'function') return Promise.resolve(window.google)
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null
    const timeout = window.setTimeout(() => fail(), 20000)
    function cleanup() {
      window.clearTimeout(timeout)
      script?.removeEventListener('load', loaded)
      script?.removeEventListener('error', fail)
      delete window.initRoutewiseGoogleMaps
    }
    function loaded() {
      if (typeof window.google?.maps?.Map !== 'function') return
      cleanup()
      resolve(window.google)
    }
    function fail() {
      cleanup()
      script?.remove()
      reject(new Error('Nie udało się załadować Google Maps. Spróbuj ponownie.'))
    }
    window.initRoutewiseGoogleMaps = loaded
    if (!script) {
      script = document.createElement('script')
      script.id = GOOGLE_MAPS_SCRIPT_ID
      script.async = true
      script.defer = true
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey) + '&callback=initRoutewiseGoogleMaps'
      script.addEventListener('load', loaded)
      script.addEventListener('error', fail)
      document.head.appendChild(script)
    } else {
      script.addEventListener('load', loaded)
      script.addEventListener('error', fail)
    }
  }).catch(error => {
    googleMapsPromise = null
    throw error
  })
  return googleMapsPromise
}
