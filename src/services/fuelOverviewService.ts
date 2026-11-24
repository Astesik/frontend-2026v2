import { api } from './api'
export type OverviewBucket = 'DAY' | 'WEEK' | 'MONTH'
export type OverviewMethod = 'can' | 'transactions' | 'adjusted'
export interface OverviewMetric { cycles: number; distanceKm: number; liters: number; rate: number | null }
export interface OverviewComparison {
  can: OverviewMetric; transactions: OverviewMetric; adjusted: OverviewMetric
  transactionDifferenceLiters: number | null; transactionDifferencePercent: number | null
  adjustedDifferenceLiters: number | null; adjustedDifferencePercent: number | null
}
export interface FuelOverview {
  from: string; to: string; bucket: OverviewBucket; canAnalyze: boolean; processing: boolean
  summary: { dieselLiters: number; adBlueLiters: number; transactions: number; unassigned: number; visits: number | null; toVerify: number | null }
  status: { full: number; partial: number; unknown: number } | null
  overall: OverviewComparison
  daily: { date: string; dieselLiters: number; adBlueLiters: number }[]
  trend: { date: string; methods: OverviewComparison }[]
  vehicles: { id: number; plate: string; methods: OverviewComparison }[]
  stations: { name: string; visits: number; dieselLiters: number; adBlueLiters: number }[]
  groups: { id: number; name: string }[]
}
export interface FuelOverviewDashboard {
  current: FuelOverview
  previousMonth: FuelOverview['summary']
  previousFrom: string; previousTo: string
  refuelingHistory: FuelOverview['daily']
  weeklyTrend: FuelOverview['trend']; monthlyTrend: FuelOverview['trend']
}
export function retainDashboardAnalytics(previous: FuelOverviewDashboard | null, next: FuelOverviewDashboard): FuelOverviewDashboard {
  if (!previous || !next.current.processing || !next.current.canAnalyze || !previous.current.canAnalyze || next.current.from !== previous.current.from) return next
  return { ...next, current: { ...next.current, overall: previous.current.overall, vehicles: previous.current.vehicles }, weeklyTrend: previous.weeklyTrend, monthlyTrend: previous.monthlyTrend }
}
export const fuelOverviewService = {
  async dashboard(signal: AbortSignal) {
    return (await api.get<FuelOverviewDashboard>('/api/fuel/overview/dashboard', { signal, skipErrorToast: true })).data
  },
  async get(from: string, to: string, bucket: OverviewBucket, q: string, groupId: string, signal: AbortSignal) {
    return (await api.get<FuelOverview>('/api/fuel/overview', {
      params: { from, to, bucket, q, groupId: groupId || undefined }, signal, skipErrorToast: true,
    })).data
  },
}
