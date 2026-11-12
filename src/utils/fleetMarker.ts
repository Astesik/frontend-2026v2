import arrowBigUp from '@tabler/icons/outline/arrow-big-up.svg?raw'
import alertHexagon from '@tabler/icons/outline/alert-hexagon.svg?raw'
import navigation from '@tabler/icons/outline/navigation.svg?raw'
import tool from '@tabler/icons/outline/tool.svg?raw'
import worldX from '@tabler/icons/outline/world-x.svg?raw'

export type FleetMarkerState = 'repair' | 'alert' | 'power' | 'idle' | 'ignition-on' | 'moving-low' | 'moving-medium' | 'moving-high'

function markerSvg(svg: string, stroke: number, className = '') {
  const markup = svg.replace('<svg', '<svg aria-hidden="true"').replace('stroke-width="2"', `stroke-width="${stroke}"`)
  return className ? markup.replace('class="', `class="${className} `) : markup
}

const repairIcon = markerSvg(tool, 2.25)
const alertIcon = markerSvg(alertHexagon, 2.25)
const noSignalIcon = markerSvg(worldX, 2.25)
const headingIcon = markerSvg(arrowBigUp, 2.25, 'rw-fleet-marker-heading')
export const routePointHeadingIconSvg = markerSvg(navigation, 2.6, 'rw-route-point-heading')

export function fleetMarkerIconSvg(state: FleetMarkerState) {
  if (state === 'repair') return repairIcon
  if (state === 'alert') return alertIcon
  if (state === 'power') return noSignalIcon
  if (state === 'idle' || state === 'ignition-on') return ''
  return headingIcon
}
