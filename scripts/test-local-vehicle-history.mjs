import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
const require=createRequire(import.meta.url)
const {effectScope}=require('vue')
function load(file,mocks={}) {
  const exports={}
  const code=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{exports,AbortController,Intl,Date,Number,console,require:name=>mocks[name]||require(name)})
  return exports
}
const json=value=>JSON.parse(JSON.stringify(value))
const utils=load('src/utils/localPositionHistory.ts')
const entry={truck:{id:267,currentDrivers:[{driverId:99}]},tripStartedOn:'2026-10-06',returnDriver:{driverId:2,externalId:'12345678901234567'},departureDriver:{driverId:3}}
assert.deepEqual(json(utils.returnTripRequest(entry)),{vehicle_id:267,started_on:'2026-10-06',driver_id:2})
assert.deepEqual(json(utils.returnTripRequest({...entry,returnDriver:{driverId:null,externalId:'12345678901234567'}})),{vehicle_id:267,started_on:'2026-10-06',driver_external_id:'12345678901234567'})
assert.equal(utils.returnTripRequest({...entry,returnDriver:null}),null)
assert.equal(utils.returnTripRequest({...entry,tripStartedOn:null}),null)
assert.equal(utils.returnTripRequest({...entry,returnDriver:{driverId:null,externalId:12345678901234567}}),null)
assert.equal(utils.historyMetric(0,'km'),'0,00 km')
assert.equal(utils.historyMetric(null,'km'),'Brak danych')
assert.equal(utils.validHistoryPosition({lat:0,lon:0,positionValid:true}),true)
for(const point of [{lat:51,lon:19,positionValid:false},{lat:null,lon:19},{lat:91,lon:19},{lat:51,lon:NaN}])assert.equal(utils.validHistoryPosition(point),false)
const first={id:1,deviceId:259,provider:'GPS_ONLINE',ts:'2026-10-06T08:00:00Z',lat:52,lon:19,positionValid:true}
assert.equal(utils.historySegmentBreak(first,{...first,ts:'2026-10-06T08:06:00Z'}),true)
assert.equal(utils.historySegmentBreak(first,{...first,deviceId:100}),true)
assert.equal(utils.historySegmentBreak(first,{...first,ts:'2026-10-06T08:03:00Z'}),false)
assert.equal(utils.fuelEventLabel({type:'POSSIBLE_FUEL_LOSS'}),'Potencjalny ubytek paliwa')
const calls=[],api={post:async(...args)=>{calls.push(args);return {data:{ok:true}}}}
const serviceModule=load('src/services/localPositionHistoryService.ts',{'./api':{api}})
const service=serviceModule.localPositionHistoryService
const request=utils.returnTripRequest(entry)
await service.driverTrip(request)
await service.page({vehicle_id:267,from:'a',to:'b'})
await service.summary({vehicle_id:267,from:'a',to:'b'})
assert.deepEqual(calls.map(c=>c[0]),['/api/positions/history/local/driver-trip','/api/positions/history/local','/api/positions/history/local/summary'])
assert.equal(calls[0][2].skipErrorToast,true)
const report={source:'LOCAL_DATABASE',status:'RESOLVED',vehicleId:267,resolvedFrom:'2026-10-06T08:00:00Z',to:'2026-10-07T12:00:00Z',timezone:'Europe/Warsaw',summary:{sampleCount:3,distanceKm:0,fuelUsedLiters:null,consumptionLPer100Km:null,warnings:[],fuelEvents:[]},warnings:[]}
const bodies=[],toasts=[]
let resolveReport,resolvePage
let trip=async()=>report,page=async body=>{
  bodies.push(json(body))
  return body.cursor?{from:report.resolvedFrom,to:report.to,result:[{...first,id:3}],hasMore:false,nextCursor:null,summary:null}:{from:report.resolvedFrom,to:report.to,result:[first,{...first,id:2,lat:null,positionValid:false}],hasMore:true,nextCursor:{ts:first.ts,id:2},summary:null}
}
service.driverTrip=(...args)=>trip(...args)
service.page=(...args)=>page(...args)
const useHistory=load('src/composables/useLocalVehicleHistory.ts',{
  '@/services/localPositionHistoryService':serviceModule,
  '@/services/api':{getApiErrorMessage:e=>e.message},
  '@/stores/uiStore':{useUiStore:()=>({addToast:t=>toasts.push(t)})}
}).useLocalVehicleHistory
const scope=effectScope()
const history=scope.run(()=>useHistory())
await history.load(request)
assert.equal(history.records.value.length,3)
assert.equal(history.records.value[1].positionValid,false)
assert.equal(history.report.value.summary.distanceKm,0)
assert.equal(history.progress.value,100)
assert.equal(history.complete.value,true)
assert.equal(bodies[0].includeSummary,false)
assert.equal(bodies[1].from,bodies[0].from)
assert.equal(bodies[1].to,bodies[0].to)
assert.deepEqual(bodies[1].cursor,{ts:first.ts,id:2})
assert.equal('device_id' in bodies[0],false)
trip=async()=>({...report,status:'DRIVER_NOT_OBSERVED',resolvedFrom:null,summary:null})
await history.load(request)
assert.equal(history.records.value.length,0)
assert.equal(bodies.length,2)
assert.equal(history.error.value,'')
trip=()=>new Promise(resolve=>{resolveReport=resolve})
const staleReport=history.load(request);history.clear();resolveReport(report);await staleReport
assert.equal(history.report.value,null)
trip=async()=>report;page=()=>new Promise(resolve=>{resolvePage=resolve})
const stalePage=history.load(request);await new Promise(resolve=>setImmediate(resolve))
history.clear();resolvePage({result:[first],hasMore:false});await stalePage
assert.equal(history.records.value.length,0)
assert.equal(history.report.value,null)
page=async()=>{throw new Error('Brak danych dla firmy')}
await history.load(request)
assert.equal(toasts.length,1)
assert.equal(history.error.value,'Brak danych dla firmy')
page=async()=>({from:report.resolvedFrom,to:report.to,result:[],hasMore:true,nextCursor:{ts:first.ts,id:1},summary:null})
await history.load(request)
assert.match(history.error.value,/powtarzający/)
scope.stop()
assert.equal(history.records.value.length,0)
console.log('PASS: driver selection, external ID precision, local endpoints, frozen pagination, null/zero, invalid coordinates, gaps, cancellation, empty driver report and errors.')
