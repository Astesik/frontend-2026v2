declare global {
  interface Window {
    H?: any
  }
}

const HERE_SCRIPT_URLS = [
  'https://js.api.here.com/v3/3.1/mapsjs-core.js',
  'https://js.api.here.com/v3/3.1/mapsjs-service.js',
  'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js',
  'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
]

const HERE_UI_CSS_URL = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css'

let hereMapsPromise: Promise<any> | null = null

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve()
        return
      }

      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error(`Nie udalo sie zaladowac ${src}`)), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.defer = false
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    }, { once: true })
    script.addEventListener('error', () => reject(new Error(`Nie udalo sie zaladowac ${src}`)), { once: true })
    document.head.appendChild(script)
  })
}

function loadStylesheet(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

export async function loadHereMaps() {
  if (window.H?.Map) {
    return window.H
  }

  if (!hereMapsPromise) {
    hereMapsPromise = (async () => {
      loadStylesheet(HERE_UI_CSS_URL)

      for (const scriptUrl of HERE_SCRIPT_URLS) {
        await loadScript(scriptUrl)
      }

      if (!window.H?.Map) {
        throw new Error('HERE Maps API nie zostalo zainicjalizowane.')
      }

      return window.H
    })()
  }

  return hereMapsPromise
}

export {}
