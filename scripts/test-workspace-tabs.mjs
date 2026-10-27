import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript } from '@vue/compiler-sfc'
const require = createRequire(import.meta.url), vue = require('vue'), pinia = require('pinia'), vr = require('vue-router')
const storage = new Map(), modules = new Map()
const sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) }
class Node {
  constructor(tag='div') { this.tag=tag; this.children=[]; this.props={}; this.style={setProperty:(k,v)=>{this.style[k]=v}}; this.dataset={}; this.parent=null; this.scrollTop=0;this.scrollLeft=0 }
  appendChild(node) { insert(node,this) }
  remove() { remove(this) }
  getBoundingClientRect() {
    if(this.props['data-workspace-tab']) {const index=this.parent.children.filter(node=>node.props['data-workspace-tab']).indexOf(this);return {top:0,left:200+index*120,bottom:32,right:320+index*120,width:120,height:32}}
    return {top:40,left:200,bottom:840,right:1200,width:1000,height:800}
  }
  matches(selector) { const attr=selector.match(/^\[([^=\]]+)(?:="([^"]+)")?\]$/);return attr ? attr[2]===undefined ? this.props[attr[1]]!==undefined : this.props[attr[1]]===attr[2] : this.tag===selector }
  querySelectorAll(selector) { return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]) }
  querySelector(selector) { return this.querySelectorAll(selector)[0]||null }
  closest(selector) { return this.matches(selector)?this:this.parent?.closest(selector)||null }
  focus() { document.activeElement=this }
}
function remove(node) { if(node?.parent) { const siblings=node.parent.children; siblings.splice(siblings.indexOf(node),1);node.parent=null } }
function insert(node,parent,anchor=null) { remove(node);const index=anchor ? parent.children.indexOf(anchor):-1;parent.children.splice(index<0?parent.children.length:index,0,node);node.parent=parent }
const handlers=new Map(),frames=new Map();let nextFrame=0
const rootClasses=new Set()
function addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn)}
function removeEventListener(type,fn){handlers.get(type)?.delete(fn)}
function dispatch(type,event={}){for(const fn of [...(handlers.get(type)||[])])fn(event)}
const body = new Node('body'), document = {body,documentElement:{classList:{toggle(name,value){if(value)rootClasses.add(name);else rootClasses.delete(name)},remove:name=>rootClasses.delete(name)}},createElement:tag=>new Node(tag),activeElement:null,addEventListener,removeEventListener}
const window={addEventListener,removeEventListener}
const TestTransitionGroup=vue.defineComponent({props:['name'],setup:(_props,{slots})=>()=>slots.default?.()})
function load(file) {
  if(modules.has(file)) return modules.get(file)
  const exports={};modules.set(file,exports)
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8')
  const script=file.endsWith('.vue') ? compileScript(parse(source,{filename:file}).descriptor,{id:file.replace(/\W/g,'_'),inlineTemplate:true}).content : source
  const code=ts.transpileModule(script,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{exports,console,sessionStorage,document,window,setTimeout,clearTimeout,ResizeObserver:class {observe(){}disconnect(){}},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame},cancelAnimationFrame:id=>frames.delete(id),require:name=>{
    if(name==='vue')return {...vue,TransitionGroup:TestTransitionGroup}
    if(name.startsWith('@/')) return load('src/'+name.slice(2)+(name.endsWith('.vue')?'':'.ts'))
    if(name.startsWith('.')) { const url=new URL(name,new URL('../'+file,import.meta.url));return load(url.pathname.replace(/^\/[A-Za-z]:/,'').split('/frontend/frontend/').at(-1)+(name.endsWith('.vue')?'':'.ts')) }
    return require(name)
  }})
  return exports
}
const registry=load('src/workspace/registry.ts'), {useWorkspaceTabsStore,MAX_WORKSPACE_TABS}=load('src/stores/workspaceTabsStore.ts')
const context=load('src/composables/useWorkspace.ts')
const allowed=()=>true
pinia.setActivePinia(pinia.createPinia())
const store=useWorkspaceTabsStore()
store.ensureContext('user1','company1',allowed)
assert.deepEqual(Array.from(store.tabs,t=>t.id),['map'])
const descriptor=name=>registry.workspaceDescriptor(name)
store.activate(descriptor('drivers'));store.activate(descriptor('repairs'));store.activate(descriptor('drivers'))
assert.equal(store.tabs.length,3)
store.close('map');store.move('map','repairs');store.pin('map')
assert.equal(store.tabs[0].id,'map');assert.equal(store.tabs[0].pinned,true)
store.pin('repairs');assert.equal(store.tabs[1].id,'repairs')
store.pin('repairs');store.move('repairs','drivers');assert.equal(store.tabs[2].id,'repairs')
store.close('drivers');assert.equal(store.activeId,'repairs')
assert.equal(registry.workspaceDescriptor('repair-detail',52).id,'repair-detail:52')
assert.equal(registry.workspaceDescriptor('repair-detail','bad'),null)
assert.equal(registry.canOpenWorkspace('vehicles',{canManageCompany:false,hasActiveCompanyRole:()=>false,hasActiveCompanyPermission:p=>p==='vehicles.create'}),false)
store.viewState.repairs={repairSearch:'WGM',repairViewMode:'list'};store.scrollPositions.repairs=240
store.pin('repairs')
store.activate(descriptor('devices'));store.viewState.devices={searchQuery:'Temporary'};store.scrollPositions.devices=300
store.activate(descriptor('repairs'))
await vue.nextTick()
const savedWorkspace=JSON.parse(sessionStorage.getItem('routewise.workspace.v1.user1.company1'))
assert.equal(savedWorkspace.tabs.some(tab=>tab.name==='devices'),false)
assert.equal(savedWorkspace.state.devices,undefined);assert.equal(savedWorkspace.scroll.devices,undefined)
// Older workspaces saved inactive non-pinned tabs too; migration must discard those.
savedWorkspace.tabs.push({name:'drivers',pinned:false,lastUsed:999});savedWorkspace.state.drivers={searchQuery:'Legacy'}
savedWorkspace.tabs.push({name:'vehicle-detail',recordId:'1',pinned:true,title:'WGM1234',lastUsed:0})
savedWorkspace.tabs.push({name:'device-detail',recordId:'2',pinned:true,title:'Urządzenie #2',lastUsed:0})
sessionStorage.setItem('routewise.workspace.v1.user1.company1',JSON.stringify(savedWorkspace))
const restored=useWorkspaceTabsStore(pinia.createPinia());restored.ensureContext('user1','company1',allowed)
assert.equal(restored.activeId,'repairs');assert.equal(restored.viewState.repairs.repairSearch,'WGM');assert.equal(restored.scrollPositions.repairs,240)
assert.deepEqual(Array.from(restored.tabs,tab=>tab.id),['map','repairs','vehicle-detail:1','device-detail:2']);assert.equal(restored.viewState.drivers,undefined)
assert.equal(restored.tabs.find(tab=>tab.id==='vehicle-detail:1').title,'Pojazd - WGM1234')
assert.equal(restored.tabs.find(tab=>tab.id==='device-detail:2').title,'Urządzenie')
assert.equal(restored.reorder(['repairs','map']),false)

// Reload retains the active unpinned record plus every pinned tab, with UI state only for those tabs.
const refreshStore=useWorkspaceTabsStore(pinia.createPinia())
refreshStore.ensureContext('refresh','company1',allowed)
refreshStore.activate(descriptor('vehicles'));refreshStore.pin('vehicles')
refreshStore.activate(descriptor('drivers'));refreshStore.viewState.drivers={searchQuery:'Discard after reload'}
const vehicle99=registry.workspaceDescriptor('vehicle-detail',99)
refreshStore.activate(vehicle99,'/vehicles/99?focus=info');refreshStore.setTitle(vehicle99.id,'Pojazd - QA99')
refreshStore.viewState[vehicle99.id]={activeVehicleTab:'information'};refreshStore.scrollPositions[vehicle99.id]=120
await vue.nextTick()
const refreshSaved=JSON.parse(sessionStorage.getItem('routewise.workspace.v1.refresh.company1'))
assert.deepEqual(refreshSaved.tabs.map(tab=>tab.name),['map','vehicles','vehicle-detail'])
assert.equal(refreshSaved.activeId,vehicle99.id)
assert.equal(refreshSaved.tabs.at(-1).pinned,false)
assert.equal(refreshSaved.state.drivers,undefined)
const refreshRestored=useWorkspaceTabsStore(pinia.createPinia());refreshRestored.ensureContext('refresh','company1',allowed)
assert.deepEqual(Array.from(refreshRestored.tabs,tab=>tab.id),['map','vehicles','vehicle-detail:99'])
assert.equal(refreshRestored.activeId,'vehicle-detail:99')
assert.equal(refreshRestored.activeTab.pinned,false,'Reload must not pin the active tab')
assert.equal(refreshRestored.viewState['vehicle-detail:99'].activeVehicleTab,'information')
assert.equal(refreshRestored.scrollPositions['vehicle-detail:99'],120)
refreshRestored.activate(descriptor('devices'))
await vue.nextTick()
const changedActive=JSON.parse(sessionStorage.getItem('routewise.workspace.v1.refresh.company1'))
assert.deepEqual(changedActive.tabs.map(tab=>tab.name),['map','vehicles','devices'])
assert.equal(changedActive.state['vehicle-detail:99'],undefined)
const deviceRestored=useWorkspaceTabsStore(pinia.createPinia());deviceRestored.ensureContext('refresh','company1',allowed)
assert.equal(deviceRestored.activeId,'devices');assert.equal(deviceRestored.activeTab.pinned,false)
refreshRestored.activate(descriptor('map'));await vue.nextTick()
const pinnedActive=JSON.parse(sessionStorage.getItem('routewise.workspace.v1.refresh.company1'))
assert.deepEqual(pinnedActive.tabs.map(tab=>tab.name),['map','vehicles'])

restored.ensureContext('user1','company2',allowed);assert.equal(restored.tabs.length,1);assert.equal(Object.keys(restored.viewState).length,0)
restored.ensureContext('user2','company1',allowed);assert.equal(restored.tabs.length,1)
restored.ensureContext('user1','company1',name=>name==='map');assert.equal(restored.tabs.length,1)
restored.resetApiState();assert.equal(sessionStorage.getItem('routewise.workspace.v1.user1.company1'),null)

// Exercise the actual application guards during a reload, including a record URL with a query.
const guardStore=useWorkspaceTabsStore(pinia.createPinia());guardStore.ensureContext('guard','company1',allowed)
guardStore.activate(descriptor('vehicles'));guardStore.pin('vehicles');guardStore.activate(vehicle99,'/vehicles/99?focus=info');await vue.nextTick()
const guardRestored=useWorkspaceTabsStore(pinia.createPinia())
const routerSource=readFileSync(new URL('../src/router/index.ts',import.meta.url),'utf8')
const routerAst=ts.createSourceFile('router.ts',routerSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
const guardCode=name=>routerAst.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(routerAst)==='router.'+name).expression.arguments[0].getText(routerAst)
const guardAuth={isRestored:true,isAuthenticated:true,canManageCompany:false,user:{id:'guard'},activeCompanyId:'company1',hasActiveCompanyRole:()=>false,hasActiveCompanyPermission:()=>true}
const startLocation={},guards={}
vm.runInNewContext(ts.transpileModule('guards.before = '+guardCode('beforeEach')+'; guards.after = '+guardCode('afterEach'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
  guards,useAuthStore:()=>guardAuth,useWorkspaceTabsStore:()=>guardRestored,canOpenWorkspace:registry.canOpenWorkspace,describeWorkspaceRoute:registry.describeWorkspaceRoute,MAX_WORKSPACE_TABS,
  window:{matchMedia:()=>({matches:true})},performance:{getEntriesByType:()=>[{type:'reload'}]},START_LOCATION:startLocation,
  useUiStore:()=>({addToast:()=>assert.fail('Reloading the active tab must not hit the tab limit')}),
})
const refreshedRoute={name:'vehicle-detail',params:{id:'99'},fullPath:'/vehicles/99?focus=info',meta:{requiresAuth:true}}
assert.equal(guards.before(refreshedRoute,startLocation),true,'Reload must preserve the current URL instead of redirecting to a pinned tab')
guards.after(refreshedRoute,startLocation)
assert.equal(guardRestored.activeId,'vehicle-detail:99');assert.equal(guardRestored.activeTab.target,refreshedRoute.fullPath);assert.equal(guardRestored.activeTab.pinned,false)
const directRoute={name:'devices',params:{},fullPath:'/devices',meta:{requiresAuth:true}}
assert.equal(guards.before(directRoute,startLocation),true)
guards.after(directRoute,startLocation)
assert.deepEqual(Array.from(guardRestored.tabs,tab=>tab.id),['map','vehicles','devices'],'Direct entry closes a previously saved unpinned active record')
assert.equal(guardRestored.activeId,'devices');assert.equal(guardRestored.activeTab.pinned,false)
guardAuth.hasActiveCompanyPermission=()=>false
assert.equal(guards.before(refreshedRoute,startLocation),'/access-denied','Reload continues to enforce workspace permissions')
guardAuth.isAuthenticated=false
assert.equal(guards.before(refreshedRoute,startLocation).query.redirect,refreshedRoute.fullPath,'Authentication still retains the intended URL')
console.log('Workspace reload: active unpinned record/URL, pinned tabs, discarded inactive tabs, safe state, pin status and access guards OK.')

// Exercise actual RouterView + KeepAlive + workspace components with Vue's custom renderer.
const renderer=vue.createRenderer({
  insert,remove,createElement:tag=>new Node(tag),createText:text=>Object.assign(new Node('#text'),{text}),createComment:text=>Object.assign(new Node('#comment'),{text}),
  setText:(node,text)=>{node.text=text},setElementText:(node,text)=>{node.text=text;node.children=[]},parentNode:node=>node.parent,nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1]||null,
  patchProp:(node,key,previous,next)=>{node.props[key]=next;if(key==='data-workspace-tab')node.dataset.workspaceTab=next},querySelector:selector=>selector==='body'?body:null,setScopeId(){},insertStaticContent:(text,parent,anchor)=>{const node=new Node('static');node.text=text;insert(node,parent,anchor);return [node,node]},
})
const livePinia=pinia.createPinia();pinia.setActivePinia(livePinia)
const workspace=useWorkspaceTabsStore();workspace.ensureContext('live','1',allowed)
const instances=new Map(), mounts=new Map(), destroyed=new Map(), activeResources=new Set()
function page(name) { return vue.defineComponent({name,setup(){
  const route=vr.useRoute(), key=name+(route.params.id?':'+route.params.id:'')
  const searchQuery=vue.ref(''),currentPage=vue.ref(1),draft=vue.ref(''), selected=vue.ref(false),plate=vue.ref('')
  vue.watch(searchQuery,()=>{currentPage.value=1})
  const state={searchQuery,currentPage,draft,selected,plate,route,active:context.useWorkspaceActive(),portal:context.useWorkspacePortal()}
  instances.set(key,state);mounts.set(key,(mounts.get(key)||0)+1)
  context.useWorkspaceViewState({searchQuery,currentPage})
  context.useWorkspaceDirty(vue.computed(()=>Boolean(draft.value)))
  context.useWorkspaceTitle(vue.computed(()=>plate.value?`Naprawa - ${plate.value}`:null))
  vue.onActivated(()=>activeResources.add(key));vue.onDeactivated(()=>activeResources.delete(key));vue.onUnmounted(()=>{activeResources.delete(key);destroyed.set(key,(destroyed.get(key)||0)+1)})
  return ()=>vue.h('div',[vue.h('input',{value:searchQuery.value}),vue.h('span',String(route.params.id||'')),vue.h(vue.Teleport,{to:state.portal},vue.h('div',{role:'dialog'},draft.value))])
}}) }
const WorkspaceOutlet=load('src/components/workspace/WorkspaceOutlet.vue').default
const router=vr.createRouter({history:vr.createMemoryHistory(),routes:[{path:'/',component:WorkspaceOutlet,children:[{path:'map',name:'map',component:page('map')},{path:'drivers',name:'drivers',component:page('drivers')},{path:'repairs',name:'repairs',component:page('repairs')},{path:'repairs/:id',name:'repair-detail',component:page('repair-detail')}]}]})
router.afterEach(to=>workspace.activate(registry.describeWorkspaceRoute(to),to.fullPath))
const app=renderer.createApp({render:()=>vue.h(vr.RouterView)})
app.use(livePinia);app.use(router)
const root=new Node('root')
await router.push('/map');await router.isReady();app.mount(root)
async function settle(){for(let i=0;i<5;i++)await vue.nextTick()}
await settle()
workspace.viewState.drivers={searchQuery:'Przywrócone filtry',currentPage:5}
await router.push('/drivers');await settle()
const drivers=instances.get('drivers');assert.equal(drivers.currentPage.value,5);assert.equal(drivers.searchQuery.value,'Przywrócone filtry')
drivers.searchQuery.value='Kowalski';await settle();drivers.currentPage.value=5;drivers.draft.value='Niezapisane';drivers.selected.value=true
await settle()
const portal=drivers.portal
await router.push('/repairs');await settle()
assert.equal(portal.style.display,'none');assert.equal(drivers.active.value,false)
assert.equal(workspace.dirtyIds.includes('drivers'),true)
assert.equal(activeResources.size,1)
await router.push('/drivers');await settle()
assert.equal(instances.get('drivers'),drivers);assert.equal(mounts.get('drivers'),1)
assert.equal(drivers.searchQuery.value,'Kowalski');assert.equal(drivers.currentPage.value,5);assert.equal(drivers.selected.value,true);assert.equal(drivers.draft.value,'Niezapisane')
assert.equal(portal.style.display,'');assert.equal(drivers.active.value,true)
await router.push('/repairs/52');await settle();const record52=instances.get('repair-detail:52');record52.draft.value='Rekord 52'
await router.push('/repairs/53');await settle();const record53=instances.get('repair-detail:53');record53.draft.value='Rekord 53'
record52.plate.value='WGM0052';record53.plate.value='FZ0053';await settle()
assert.equal(workspace.tabs.find(tab=>tab.id==='repair-detail:52').title,'Naprawa - WGM0052')
assert.equal(workspace.tabs.find(tab=>tab.id==='repair-detail:53').title,'Naprawa - FZ0053')
assert.equal(record52.route.params.id,'52');assert.equal(record53.route.params.id,'53')
await router.push('/repairs/52');await settle()
assert.equal(instances.get('repair-detail:52'),record52);assert.equal(record52.draft.value,'Rekord 52')
await router.push('/map');await settle();workspace.close('drivers');await settle()
assert.equal(destroyed.get('drivers'),1);assert.equal(portal.parent,null)
await router.push('/drivers');await settle();assert.equal(mounts.get('drivers'),2);assert.equal(instances.get('drivers').draft.value,'');assert.equal(instances.get('drivers').searchQuery.value,'')
router.back();await new Promise(resolve=>setImmediate(resolve));await settle();assert.equal(router.currentRoute.value.name,'map');assert.equal(workspace.activeId,'map')
router.forward();await new Promise(resolve=>setImmediate(resolve));await settle();assert.equal(workspace.activeId,'drivers')
workspace.pin('repair-detail:52')
await settle()
const persisted=JSON.parse(sessionStorage.getItem('routewise.workspace.v1.live.1'))
assert.equal(JSON.stringify(persisted).includes('Rekord 52'),false)
assert.equal(JSON.stringify(persisted).includes('Niezapisane'),false)
assert.equal(persisted.tabs.find(tab=>tab.recordId==='52').title,'Naprawa - WGM0052')
workspace.ensureContext('another','1',allowed);await settle();assert.equal(destroyed.get('repair-detail:52'),1)
app.unmount();assert.equal(activeResources.size,0)
assert.equal(MAX_WORKSPACE_TABS,20)
console.log('Workspace: stable IDs, locked Map, pin/order, MRU, permissions, scoped persistence, live KeepAlive instances, page/filter/form/selection retention, isolated record routes, hidden portals, resource hooks, cache eviction, back/forward and logout reset OK.')

// Exercise the actual tab bar; floating-layer geometry/animations are outside this renderer.
modules.set('src/components/ui/AppDropdown.vue',{__esModule:true,default:vue.defineComponent({props:['open','anchor','role','matchWidth','useAnchorMinWidth','maxHeight','minHeight','contentClass'],setup:(props,{slots})=>()=>props.open?vue.h('div',{role:props.role},slots.default?.()):null})})
modules.set('src/components/ui/AppConfirmModal.vue',{__esModule:true,default:vue.defineComponent({props:['open'],setup:()=>()=>null})})
const barPinia=pinia.createPinia();pinia.setActivePinia(barPinia)
const barStore=useWorkspaceTabsStore();barStore.ensureContext('toolbar','1',allowed)
barStore.activate(descriptor('drivers'));barStore.activate(descriptor('repairs'));barStore.activate(descriptor('vehicles'))
const barRouter={currentRoute:vue.ref({fullPath:'/vehicles'}),push:async target=>{barRouter.currentRoute.value={fullPath:target}}}
const barRoot=new Node('root')
const barApp=renderer.createApp(load('src/components/workspace/WorkspaceTabs.vue').default)
barApp.use(barPinia);barApp.provide(vr.routerKey,barRouter);barApp.mount(barRoot);await settle()
const tabElement=id=>barRoot.querySelector(`[data-workspace-tab="${id}"]`)
const tabButton=id=>tabElement(id).querySelector('[role="tab"]')
function event(currentTarget,extra={}) { return {currentTarget,preventDefault(){this.prevented=true},stopPropagation(){},...extra} }
function nodeText(node) { return [node.text||'',...node.children.map(nodeText)].join('').trim() }
const {horizontalTabOrder}=load('src/composables/useHorizontalTabDrag.ts')
const widths=Object.fromEntries(barStore.tabs.map(tab=>[tab.id,120]))
assert.deepEqual(Array.from(horizontalTabOrder(barStore.tabs,'vehicles',360,200,widths)),['map','vehicles','drivers','repairs'])
assert.deepEqual(Array.from(horizontalTabOrder(barStore.tabs,'map',900,200,widths)),['map','drivers','repairs','vehicles'])
const groups=[{id:'map',pinned:true},{id:'p1',pinned:true},{id:'p2',pinned:true},{id:'u1',pinned:false},{id:'u2',pinned:false}]
const groupWidths=Object.fromEntries(groups.map(tab=>[tab.id,100]))
assert.deepEqual(Array.from(horizontalTabOrder(groups,'u2',0,0,groupWidths)),['map','p1','p2','u2','u1'])
assert.deepEqual(Array.from(horizontalTabOrder(groups,'p1',900,0,groupWidths)),['map','p2','p1','u1','u2'])
assert.equal(tabElement('map').props.draggable,false)
assert.equal(tabElement('drivers').props.draggable,false)
assert.match(tabElement('drivers').props.class,/cursor-pointer/)
assert.doesNotMatch(tabElement('drivers').props.class,/cursor-grab/)
assert.equal(barRoot.querySelectorAll('button').some(button=>String(button.props['aria-label']).startsWith('Przesuń zakładkę')),false)
assert.equal(barRoot.querySelectorAll('button').some(button=>String(button.props['aria-label']).startsWith('Przypnij zakładkę')),false)
function pointer(currentTarget,x,extra={}){return event(currentTarget,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:16,...extra})}
tabElement('vehicles').props.onPointerdown(pointer(tabElement('vehicles'),620))
assert.equal(rootClasses.has('workspace-tab-dragging'),false)
dispatch('pointermove',pointer(null,618));await settle()
assert.equal(body.querySelector('[data-workspace-tab-preview]'),null)
assert.equal(rootClasses.has('workspace-tab-dragging'),false)
dispatch('pointermove',pointer(null,360,{clientY:900}));await settle()
assert.equal(rootClasses.has('workspace-tab-dragging'),true)
assert.deepEqual(Array.from(barStore.tabs,tab=>tab.id),['map','drivers','repairs','vehicles'])
assert.deepEqual(barRoot.querySelectorAll('[data-workspace-tab]').map(node=>node.props['data-workspace-tab']),['map','vehicles','drivers','repairs'])
assert.equal(body.querySelector('[data-workspace-tab-preview]').props.style.top,'0px')
dispatch('pointerup',pointer(null,360,{clientY:900}));await settle()
assert.equal(rootClasses.has('workspace-tab-dragging'),false)
assert.deepEqual(Array.from(barStore.tabs,tab=>tab.id),['map','vehicles','drivers','repairs'])
assert.equal(body.querySelector('[data-workspace-tab-preview]'),null)
const click=event(null);barRoot.querySelector('[role="tablist"]').props.onClickCapture(click);assert.equal(click.prevented,true)
tabElement('vehicles').props.onPointerdown(pointer(tabElement('vehicles'),380))
dispatch('pointermove',pointer(null,650));await settle()
dispatch('keydown',event(null,{key:'Escape'}));await settle()
assert.deepEqual(Array.from(barStore.tabs,tab=>tab.id),['map','vehicles','drivers','repairs'])
assert.equal(body.querySelector('[data-workspace-tab-preview]'),null)
for(const cancellation of ['pointercancel','blur']) {
  tabElement('vehicles').props.onPointerdown(pointer(tabElement('vehicles'),380))
  dispatch('pointermove',pointer(null,650));await settle()
  dispatch(cancellation,pointer(null,650));await settle()
  assert.deepEqual(Array.from(barStore.tabs,tab=>tab.id),['map','vehicles','drivers','repairs'])
  assert.equal(body.querySelector('[data-workspace-tab-preview]'),null)
}
tabElement('map').props.onPointerdown(pointer(tabElement('map'),260))
dispatch('pointermove',pointer(null,900));dispatch('pointerup',pointer(null,900));await settle()
assert.equal(barStore.tabs[0].id,'map')
await tabElement('repairs').props.onContextmenu(event(tabElement('repairs'),{clientX:550,clientY:20}));await settle()
let pinAction=barRoot.querySelector('[role="menuitem"]')
assert.equal(nodeText(pinAction),'Przypnij');assert.equal(document.activeElement,pinAction)
assert.ok(barRoot.querySelectorAll('span').some(node=>node.props.style?.left==='550px'))
pinAction.props.onClick();await settle()
assert.equal(barStore.tabs[1].id,'repairs');assert.equal(barStore.tabs[1].pinned,true)
assert.equal(tabElement('repairs').props['data-pinned'],true)
assert.match(tabElement('repairs').props.class,/workspace-tab-pinned/)
assert.equal(barRoot.querySelector('[role="menu"]'),null)
const shortcut=event(tabButton('repairs'),{key:'F10',shiftKey:true})
await tabButton('repairs').props.onKeydown(shortcut);await settle()
assert.equal(shortcut.prevented,true)
pinAction=barRoot.querySelector('[role="menuitem"]');assert.equal(nodeText(pinAction),'Odepnij')
pinAction.props.onClick();await settle();assert.equal(barStore.tabs.find(tab=>tab.id==='repairs').pinned,false)
await tabElement('map').props.onContextmenu(event(tabElement('map'),{clientX:260,clientY:20}));await settle()
assert.equal(barRoot.querySelector('[role="menu"]'),null)
await tabButton('drivers').props.onKeydown(event(tabButton('drivers'),{key:'ArrowLeft',ctrlKey:true,shiftKey:true}));await settle()
assert.deepEqual(Array.from(barStore.tabs,tab=>tab.id),['map','repairs','drivers','vehicles'])
await tabElement('drivers').props.onContextmenu(event(tabElement('drivers'),{clientX:500,clientY:20}));await settle()
barRoot.querySelector('[role="menuitem"]').props.onKeydown(event(null,{key:'Tab'}));await settle()
assert.equal(barRoot.querySelector('[role="menu"]'),null)
await tabElement('vehicles').props.onContextmenu(event(tabElement('vehicles'),{clientX:520,clientY:20}));await settle()
barRouter.currentRoute.value={fullPath:'/drivers'};await settle()
assert.equal(barRoot.querySelector('[role="menu"]'),null)
const middleDown=event(null,{button:1});tabElement('drivers').props.onMousedown(middleDown)
assert.equal(middleDown.prevented,true)
for(const button of [0,2]) { tabElement('drivers').props.onAuxclick(event(null,{button}));await settle();assert.ok(tabElement('drivers')) }
barStore.markDirty('map',true)
tabElement('map').props.onAuxclick(event(null,{button:1}));await settle()
assert.ok(tabElement('map'));assert.equal(barStore.pendingCloseId,null)
barStore.markDirty('map',false)
barStore.pin('repairs');barStore.markDirty('repairs',true)
tabElement('repairs').props.onAuxclick(event(null,{button:1}));await settle()
assert.equal(barStore.pendingCloseId,'repairs');assert.ok(tabElement('repairs'))
barStore.pendingCloseId=null;barStore.markDirty('repairs',false)
tabElement('repairs').props.onAuxclick(event(null,{button:1}));await settle()
assert.equal(tabElement('repairs'),null)
assert.equal(barStore.activeId,'vehicles')
tabElement('vehicles').props.onAuxclick(event(null,{button:1}));await settle()
assert.equal(tabElement('vehicles'),null);assert.equal(barStore.activeId,'drivers');assert.equal(barRouter.currentRoute.value.fullPath,'/drivers')
barApp.unmount()
assert.equal(rootClasses.has('workspace-tab-dragging'),false)
for(const type of ['pointermove','pointerup','pointercancel','keydown','blur'])assert.equal(handlers.get(type)?.size||0,0)
console.log('Workspace toolbar: horizontal pointer drag, cursor threshold/reset, drop commit, cancellation, locked Map, visible pins, context menu, keyboard and middle-click close/dirty confirmation OK.')

const workspacePage=readFileSync(new URL('../src/components/workspace/WorkspacePage.vue',import.meta.url),'utf8')
assert.match(workspacePage,/h-full min-h-0 w-full px-5/)
for(const name of ['VehiclesView','DevicesView','DriversView','DashboardView','TripsView','RepairsView','SettingsView','FuelStationsView','VehicleDetailView','DeviceDetailView','RepairDetailView']) {
  const source=readFileSync(new URL(`../src/views/${name}.vue`,import.meta.url),'utf8')
  assert.match(source,/md:h-full/,`${name} should fit the available workspace height`)
  assert.doesNotMatch(source,/h-\[calc\(100dvh-3rem\)\]/,`${name} must not size itself from the full viewport`)
}
console.log('Workspace sizing: lists use available parent height, not full viewport height OK.')
