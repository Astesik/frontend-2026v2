import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const pinia = require('pinia')
const memory = new Map()
const localStorage = {getItem:key=>memory.get(key) || null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)}
function load(file, mocks={}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{exports,AbortController,Intl,Date,Number,console,localStorage,require:name=>mocks[name] || require(name)})
  return exports
}
const plain=value=>JSON.parse(JSON.stringify(value))
const vehicleReturn=load('src/utils/vehicleReturn.ts')
const time=load('src/utils/historyTime.ts',{'./vehicleReturn':vehicleReturn})
for (const [day,hours] of [['2026-03-29',23],['2026-10-25',25]]) {
  const end=vehicleReturn.shiftReturnDate(day,1)
  assert.equal((time.historyLocalInstant(end+'T00:00')-time.historyLocalInstant(day+'T00:00'))/3600000,hours)
}
assert.equal(time.historyLocalInstant('2026-10-06T00:00').toISOString(),'2026-10-05T22:00:00.000Z')
assert.throws(()=>time.historyLocalInstant('2026-03-29T02:30'),/nie istnieje/)
assert.throws(()=>time.historyLocalInstant('2026-02-30T00:00'),/nie istnieje/)
assert.equal(time.historyLocalInstant('2026-10-25T02:30').toISOString(),'2026-10-25T00:30:00.000Z')
const yesterday=time.historyPresetRange('yesterday',new Date('2026-03-30T08:00:00Z'))
assert.equal((yesterday.to-yesterday.from)/3600000,23)
assert.throws(()=>time.validateHistoryRange(new Date(0),new Date(181*86400000)),/180/)
assert.throws(()=>time.validateHistoryRange(new Date(),new Date(Date.now()+120000)),/przyszłości/)
const utils=load('src/utils/localPositionHistory.ts')
const history=load('src/composables/usePositionHistory.ts',{'@/utils/localPositionHistory':utils}).usePositionHistory()
const first={id:1,deviceId:1,provider:'LOCAL',ts:'2026-10-06T08:00:00Z',positionValid:true,lat:52,lon:19}
const points=[first,{...first,id:2,lat:null},{...first,id:3,ts:'2026-10-06T08:02:00Z'},{...first,id:4,ts:'2026-10-06T08:10:00Z'},{...first,id:5,deviceId:2,ts:'2026-10-06T08:11:00Z'}]
history.append(points)
assert.equal(history.records.value.length,5)
assert.deepEqual(plain(history.pathRecordIndexes.value),[0,2,3,4])
assert.deepEqual(plain(history.segmentStarts.value),[0,2,3])
history.append([points[4],{...points[4],id:6,ts:'2026-10-06T08:12:00Z'}])
assert.equal(history.records.value.length,6)
assert.equal(history.records.value[4].id,5)
history.clear()
assert.equal(history.path.value.length,0)
assert.equal(history.segmentStarts.value.length,0)
const calls=[]
let apiPage
const module=load('src/services/localPositionHistoryService.ts',{'./api':{api:{post:async(url,body,config)=>{calls.push({url,body:plain(body),signal:config.signal});return {data:await apiPage(body,url)}}}}})
const summary={sampleCount:3,distanceKm:0,fuelUsedLiters:null,consumptionLPer100Km:null,warnings:[],fuelEvents:[]}
const range={from:'2026-10-06T08:00:00Z',to:'2026-10-06T09:00:00Z'}
const cursor={ts:first.ts,id:2}
apiPage=async body=>({...range,timezone:'Europe/Warsaw',result:body.cursor?[points[2]]:points.slice(0,2),summary:body.cursor?null:summary,hasMore:!body.cursor,nextCursor:body.cursor?null:cursor})
pinia.setActivePinia(pinia.createPinia())
const store=load('src/stores/fleetStore.ts',{
  '@/services/positionService':{positionService:{}},
  '@/services/localPositionHistoryService':module,
  '@/services/vehicleService':{vehicleService:{}},
  '@/services/vehicleGroupService':{vehicleGroupService:{}},
  '@/utils/historyTime':time,
}).useFleetStore()
const vehicle={id:'267',backendId:267,assignedDeviceId:null}
const received=[]
await store.fetchPositionHistory(vehicle,new Date(range.from),new Date(range.to),{onPage:p=>received.push(...p)})
assert.equal(received.length,3)
assert.equal(store.currentPositionHistoryLoaded,3)
assert.equal(store.currentPositionHistoryComplete,true)
assert.equal(store.currentPositionHistorySummary.distanceKm,0)
assert.equal(store.currentPositionHistorySummary.fuelUsedLiters,null)
assert.equal(calls[0].url,'/api/positions/history/local')
assert.equal(calls[0].body.vehicle_id,267)
assert.equal('device_id' in calls[0].body,false)
assert.equal(calls[0].body.includeSummary,true)
assert.equal(calls[1].body.includeSummary,false)
assert.deepEqual(calls[1].body.cursor,cursor)
assert.equal(calls[1].body.from,range.from)
assert.equal(calls[1].body.to,range.to)
apiPage=async(body,url)=>({from:body.from.replace('.000Z','Z'),to:body.to,timezone:'Europe/Warsaw',result:[],summary:{...summary,sampleCount:url.endsWith('/summary')?4:3},hasMore:false,nextCursor:null})
await store.fetchTodayRouteHistory(vehicle)
const start=store.currentPositionHistoryRange.from
const since=new Date(Date.now()-60000).toISOString()
await store.appendTodayRouteHistory(vehicle,since)
assert.equal(calls.at(-2).body.from,since)
assert.equal(calls.at(-2).body.includeSummary,false)
assert.equal(calls.at(-1).url,'/api/positions/history/local/summary')
assert.equal(calls.at(-1).body.from,start)
assert.equal(calls.at(-1).body.to,calls.at(-2).body.to)
assert.equal(store.currentPositionHistorySummary.sampleCount,4)
let resolvePage
apiPage=()=>new Promise(resolve=>{resolvePage=resolve})
const stale=store.fetchPositionHistory(vehicle,new Date(range.from),new Date(range.to),{onPage:()=>assert.fail('Stale page delivered')})
store.clearPositionHistory()
assert.equal(calls.at(-1).signal.aborted,true)
resolvePage({...range,result:[first],summary,hasMore:false,nextCursor:null})
await stale
assert.equal(store.currentPositionHistoryVehicleId,null)
assert.equal(store.currentPositionHistorySummary,null)
assert.equal(store.isRouteHistoryLoading,false)
apiPage=async()=>{throw new Error('Brak uprawnień')}
await assert.rejects(store.fetchPositionHistory(vehicle,new Date(range.from),new Date(range.to)),/Brak uprawnień/)
assert.equal(store.currentPositionHistoryComplete,false)
const view=readFileSync(new URL('../src/views/MapView.vue',import.meta.url),'utf8')
assert.equal(view.includes('getPositionHistory('),false)
assert.equal(view.includes('mileageDifferenceKm'),false)
assert.equal(view.includes('point.driver0'),false)
assert.ok(view.includes('path.push(new window.google.maps.LatLng'))
console.log('PASS: Warsaw DST, range validation, raw indices, invalid positions, segments, deduplication, local vehicle pagination, frozen bounds, null/zero, no-device history, cancellation, errors and map contract.')
