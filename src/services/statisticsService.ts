import { api } from './api'
import type { DailyFleetStatisticsResponse, DailyVehicleStatisticsResponse } from '@/types/dailyStatistics'

export const statisticsService = {
  async getTodayFleetStatistics() {
    const { data } = await api.post<DailyFleetStatisticsResponse>(
      '/api/positions/statistics/today/fleet',
      {},
      { skipErrorToast: true },
    )
    return data
  },

  async getTodayVehicleStatistics(vehicleId: number) {
    const { data } = await api.post<DailyVehicleStatisticsResponse>(
      '/api/positions/statistics/today/vehicle',
      { vehicleId },
    )
    return data
  },
}
