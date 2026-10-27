import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'

interface SortableTab { id: string; pinned: boolean }
interface DragSession {
  id: string
  pointerId: number
  startX: number
  pointerX: number
  grabOffset: number
  contentLeft: number
  scrollLeft: number
  top: number
  width: number
  height: number
  widths: Record<string, number>
}

export function horizontalTabOrder<T extends SortableTab>(tabs: T[], id: string, centerX: number, contentLeft: number, widths: Record<string, number>) {
  const source = tabs.findIndex(tab => tab.id === id)
  if (source < 0 || id === 'map') return tabs.map(tab => tab.id)
  let target = source, left = contentLeft
  tabs.forEach((tab, index) => {
    const center = left + widths[tab.id] / 2
    left += widths[tab.id]
    if (tab.id === 'map' || tab.pinned !== tabs[source].pinned) return
    if (index < source && centerX < center) target = Math.min(target, index)
    if (index > source && centerX > center) target = Math.max(target, index)
  })
  const order = tabs.map(tab => tab.id)
  order.splice(source, 1)
  order.splice(target, 0, id)
  return order
}

export function useHorizontalTabDrag<T extends SortableTab>(bar: Ref<HTMLElement | null>, tabs: Ref<T[]>, commit: (ids: string[]) => unknown) {
  const previewOrder = ref<string[] | null>(null)
  const draggedId = ref<string | null>(null)
  const ghostStyle = shallowRef<Record<string, string>>({})
  const orderedTabs = computed(() => {
    if (!previewOrder.value) return tabs.value
    const records = new Map(tabs.value.map(tab => [tab.id, tab]))
    return previewOrder.value.map(id => records.get(id)).filter((tab): tab is T => Boolean(tab))
  })
  const draggedTab = computed(() => tabs.value.find(tab => tab.id === draggedId.value))
  let session: DragSession | null = null, frame = 0, suppressClick = false
  let clickTimer: ReturnType<typeof setTimeout> | undefined

  function update() {
    const element = bar.value, current = session
    if (!element || !current || !draggedId.value) return
    const bounds = element.getBoundingClientRect()
    const contentLeft = current.contentLeft - (element.scrollLeft - current.scrollLeft)
    const left = Math.max(bounds.left, Math.min(bounds.right - current.width, current.pointerX - current.grabOffset))
    if (ghostStyle.value.left !== `${left}px`) ghostStyle.value = { left: `${left}px`, top: `${current.top}px`, width: `${current.width}px`, height: `${current.height}px` }
    const next = horizontalTabOrder(orderedTabs.value, current.id, left + current.width / 2, contentLeft, current.widths)
    if (next.some((id, index) => id !== previewOrder.value?.[index])) previewOrder.value = next
  }
  function tick() {
    if (!session || !bar.value || !draggedId.value) return
    const bounds = bar.value.getBoundingClientRect()
    if (session.pointerX < bounds.left + 24) bar.value.scrollLeft -= 8
    else if (session.pointerX > bounds.right - 24) bar.value.scrollLeft += 8
    update()
    frame = requestAnimationFrame(tick)
  }
  function move(event: PointerEvent) {
    if (!session || event.pointerId !== session.pointerId) return
    session.pointerX = event.clientX
    if (!draggedId.value && Math.abs(event.clientX - session.startX) < 5) return
    event.preventDefault()
    if (!draggedId.value) {
      draggedId.value = session.id
      ghostStyle.value = {}
      previewOrder.value = tabs.value.map(tab => tab.id)
      bar.value?.setPointerCapture?.(session.pointerId)
      frame = requestAnimationFrame(tick)
    }
    update()
  }
  function finish(commitOrder: boolean) {
    const current = session
    if (draggedId.value) {
      if (commitOrder && previewOrder.value) commit(previewOrder.value)
      suppressClick = true
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => { suppressClick = false }, 0)
    }
    session = null; draggedId.value = null; previewOrder.value = null
    cancelAnimationFrame(frame)
    if (current && bar.value?.hasPointerCapture?.(current.pointerId)) bar.value.releasePointerCapture(current.pointerId)
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', release)
    document.removeEventListener('pointercancel', cancel)
    document.removeEventListener('keydown', keydown)
    window.removeEventListener('blur', cancel)
  }
  function release(event: PointerEvent) { if (session?.pointerId === event.pointerId) finish(true) }
  function cancel() { finish(false) }
  function keydown(event: KeyboardEvent) { if (event.key === 'Escape') { event.preventDefault(); cancel() } }
  function start(event: PointerEvent, tab: T) {
    if (event.button !== 0 || !event.isPrimary || tab.id === 'map' || !bar.value) return
    finish(false)
    suppressClick = false
    const elements = [...bar.value.querySelectorAll<HTMLElement>('[data-workspace-tab]')]
    const element = elements.find(element => element.dataset.workspaceTab === tab.id)
    if (!element || !elements.length) return
    const rect = element.getBoundingClientRect()
    session = {
      id: tab.id, pointerId: event.pointerId, startX: event.clientX, pointerX: event.clientX,
      grabOffset: event.clientX - rect.left, contentLeft: elements[0].getBoundingClientRect().left,
      scrollLeft: bar.value.scrollLeft, top: rect.top, width: rect.width, height: rect.height,
      widths: Object.fromEntries(elements.map(element => [element.dataset.workspaceTab!, element.getBoundingClientRect().width])),
    }
    document.addEventListener('pointermove', move, { passive: false })
    document.addEventListener('pointerup', release)
    document.addEventListener('pointercancel', cancel)
    document.addEventListener('keydown', keydown)
    window.addEventListener('blur', cancel)
  }
  function preventDraggedClick(event: MouseEvent) {
    if (!suppressClick && !draggedId.value) return
    event.preventDefault(); event.stopPropagation()
  }
  watch(() => tabs.value.map(tab => `${tab.id}:${tab.pinned}`).join('|'), cancel)
  onBeforeUnmount(() => { cancel(); clearTimeout(clickTimer) })
  return { orderedTabs, draggedId, draggedTab, ghostStyle, start, cancel, preventDraggedClick }
}
