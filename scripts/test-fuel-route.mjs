import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const { createPinia, setActivePinia } = require('pinia')
const { reactive } = require('vue')
const storage = new Map()
function load(file, mocks = {}) {
  const exports = {}
  const source = readFileSync(new URL('../' + file, import.meta.url),'utf8').replace(/import\.meta\.env\.VITE_GOOGLE_MAPS_API_KEY/g,"'test-key'")
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{exports,crypto:webcrypto,AbortController,console,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},require:n=>mocks[n]||require(n)})
  return exports
}
const utils = load('src/utils/fuelRoute.ts')
assert.equal(utils.fuelNumber(0,'km'),'0 km')
assert.equal(utils.fuelNumber(null),'—')
assert.equal(utils.validateFuelRouteSettings({...utils.DEFAULT_FUEL_ROUTE_SETTINGS}),'')
for (const field of utils.FUEL_ROUTE_NUMERIC_FIELDS) {
  assert.ok(utils.validateFuelRouteSettings({...utils.DEFAULT_FUEL_ROUTE_SETTINGS,[field.key]:field.min-1}))
  assert.ok(utils.validateFuelRouteSettings({...utils.DEFAULT_FUEL_ROUTE_SETTINGS,[field.key]:field.max+1}))
}
assert.ok(utils.validateFuelRouteSettings({...utils.DEFAULT_FUEL_ROUTE_SETTINGS,providers:null}))
assert.ok(utils.validateFuelRouteSettings({...utils.DEFAULT_FUEL_ROUTE_SETTINGS,priceDate:'2026-02-31'}))
assert.match(utils.fuelRouteWarning('STALE_FUEL_READING'),/stary/)
let googleRequest, encodedPath
const google = {maps:{
  LatLng:class {constructor(lat,lng){this.lat=lat;this.lng=lng}},
  importLibrary:async library=>library==='routes' ? {Route:{computeRoutes:async request=>{
    googleRequest=request
    return {routes:[{path:[{lat:52,lng:19},{lat:53,lng:20}],legs:[{endLocation:{lat:53,lng:20}}],distanceMeters:125000,durationMillis:3600000}]}
  }}}:{encoding:{encodePath:points=>{encodedPath=points;return 'precision-five'}}}
}}
const service = load('src/services/googleFuelRouteService.ts',{'./googleMapsLoader':{loadGoogleMaps:async()=>google}}).googleFuelRouteService
const geometry = await service.calculate({lat:52,lng:19},[{id:'a',address:'Warszawa',position:null},{id:'b',address:'Gdańsk',position:null}])
assert.equal(googleRequest.origin.lat,52)
assert.equal(googleRequest.destination,'Gdańsk')
assert.equal(googleRequest.intermediates[0].location,'Warszawa')
assert.equal(googleRequest.polylineQuality,'HIGH_QUALITY')
assert.equal(geometry.distanceKm,125)
assert.equal(geometry.durationMinutes,60)
assert.equal(encodedPath.length,2)
const auth = reactive({isAuthenticated:true,activeCompanyId:'1',admin:false,permissions:[],hasActiveCompanyRole(){return this.admin},hasActiveCompanyPermission(p){return this.permissions.includes(p)}})
const permissions=load('src/composables/useFuelRoutePermissions.ts',{'@/stores/authStore':{useAuthStore:()=>auth}}).useFuelRoutePermissions()
auth.permissions=['company.manage'];assert.equal(permissions.canRead.value,false)
auth.permissions=['vehicles.read','positions.read','fuel_stations.read'];assert.equal(permissions.canRead.value,true)
auth.permissions=['vehicles.read','positions.read'];assert.equal(permissions.canRead.value,false)
auth.admin=true;assert.equal(permissions.canRead.value,true)
const fleet = reactive({vehicles:[{id:'267',backendId:267,rawType:'TRUCK',rawStatus:'ACTIVE',hasPosition:true,latitude:52,longitude:19}]})
const toasts=[],bodies=[]
let routeResolver, backendResolver
let compute=async()=>geometry, search=async body=>{bodies.push(body);return {stations:[],cheapestByCurrency:[],reachableCheapestByCurrency:[],fuel:{status:'UNKNOWN'}}}
const stationState = reactive({ activityRevision: 0 })
storage.set('routewise.fuelRoute.settings',JSON.stringify({...utils.DEFAULT_FUEL_ROUTE_SETTINGS,companyId:999}))
setActivePinia(createPinia())
const store=load('src/stores/fuelRouteStore.ts',{
  './fleetStore':{useFleetStore:()=>fleet},
  './fuelStationStore':{useFuelStationStore:()=>stationState},
  './uiStore':{useUiStore:()=>({addToast:t=>toasts.push(t)})},
  '@/services/fuelRouteService':{fuelRouteService:{search:(...args)=>search(...args)}},
  '@/services/googleFuelRouteService':{googleFuelRouteService:{calculate:(...args)=>compute(...args)}},
  '@/services/api':{getApiErrorMessage:e=>e.message},
  '@/utils/fuelRoute':utils
}).useFuelRouteStore()
store.ensureCompany('1');store.selectVehicle('267');store.waypoints[0].address='Gdańsk'
assert.equal(await store.calculate(),true)
assert.equal(bodies[0].vehicleId,267)
assert.equal(bodies[0].encodedPolyline,'precision-five')
for(const key of ['companyId','serialNumber','deviceId','priceDate'])assert.equal(key in bodies[0],false)
assert.equal(store.result.fuel.status,'UNKNOWN')
stationState.activityRevision++
assert.equal(store.result,null)
assert.equal(store.route,null)
compute=()=>new Promise(resolve=>{routeResolver=resolve})
const pending=store.calculate();store.waypoints[0].address='Kraków';routeResolver(geometry);await pending
assert.equal(bodies.length,1);assert.equal(store.result,null)
compute=async()=>geometry
search=()=>new Promise(resolve=>{backendResolver=resolve})
const pendingBackend=store.calculate();await new Promise(resolve=>setImmediate(resolve))
store.resetApiState();backendResolver({stations:[{id:999}]});await pendingBackend
assert.equal(store.result,null);assert.equal(store.route,null);assert.equal(store.selectedVehicleId,null)
search=async()=>{throw new Error('Niepoprawna geometria')}
store.selectVehicle('267');store.waypoints[0].address='Gdańsk';await store.calculate()
assert.equal(toasts.length,1);assert.equal(store.error,'Niepoprawna geometria')
store.selectVehicle('267');fleet.vehicles[0].rawType='TRAILER'
assert.equal(await store.calculate(),false)
fleet.vehicles[0].rawType='TRUCK'
search=async()=>({stations:[{id:1,active:true},{id:2,active:false}],cheapestByCurrency:[{currency:'EUR',stations:[{id:2,active:false}]}],reachableCheapestByCurrency:[{currency:'EUR',stations:[{id:1,active:true},{id:2,active:false}]}],fuel:{status:'UNKNOWN'}})
assert.equal(await store.calculate(),true)
assert.equal(store.result.stations.length,1)
assert.equal(store.result.cheapestByCurrency.length,0)
assert.equal(store.result.reachableCheapestByCurrency[0].stations.length,1)
console.log('Fuel route: validation, geometry, permissions, internal IDs, race cancellation and errors OK')
