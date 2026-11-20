import type { FuelTank, FuelTankObservation, FuelTankProfile } from '@/services/fuelTankService'

export interface FuelTankLevel extends FuelTank {
  percent: number | null
  estimatedLiters: number | null
}

export function estimateFuelTankLevels(profile: FuelTankProfile | null, observation: FuelTankObservation | null) {
  const percent = observation?.percent
  const recordedAt = Date.parse(observation?.source.recordedAt ?? '')
  const canEstimate = profile != null && profile.levelSource === 'CAN' && profile.levelTank !== 'UNKNOWN'
    && observation?.source.provider === 'GPS_ONLINE'
    && percent != null && Number.isFinite(percent) && percent >= 0 && percent <= 100
    && recordedAt >= Date.parse(profile.validFrom)
    && (!profile.validTo || recordedAt < Date.parse(profile.validTo))
  const tanks: FuelTankLevel[] = (profile?.tanks ?? []).map(tank => {
    const measured = canEstimate && tank.product === 'DIESEL'
      && (profile?.connection !== 'SEPARATE' || tank.slot === profile.levelTank)
    return {
      ...tank,
      percent: measured ? percent : null,
      estimatedLiters: measured ? Math.round(tank.nominalCapacityLiters * percent * 10) / 1000 : null,
    }
  })
  const diesel = tanks.filter(tank => tank.product === 'DIESEL')
  const totalLiters = diesel.length && diesel.every(tank => tank.estimatedLiters != null)
    ? Math.round(diesel.reduce((sum, tank) => sum + (tank.estimatedLiters ?? 0), 0) * 1000) / 1000
    : null
  return { tanks, totalLiters }
}
