import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { statisticsService } from '@/services/statisticsService'
import { getApiErrorMessage } from '@/services/api'
import { useUiStore } from './uiStore'
import type { DailyFleetStatisticsResponse } from '@/types/dailyStatistics'

export const useDailyStatisticsStore = defineStore('dailyStatistics', () => {
  const data = ref<DailyFleetStatisticsResponse | null>(null)
  const companyId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref('')
  let generation = 0
  let pending: Promise<void> | null = null
  const vehicles = computed(() => data.value?.vehicles || [])

  function resetApiState() {
    generation += 1
    pending = null
    data.value = null
    companyId.value = null
    isLoading.value = false
    error.value = ''
  }

  function load(company: string): Promise<void> {
    if (companyId.value !== company) {
      resetApiState()
      companyId.value = company
    }
    if (pending) return pending

    const requestGeneration = generation
    isLoading.value = true
    error.value = ''
    pending = (async () => {
      try {
        const response = await statisticsService.getTodayFleetStatistics()
        // A response from an old company/session must never restore cleared data.
        if (generation === requestGeneration) data.value = response
      } catch (cause) {
        if (generation !== requestGeneration) return
        error.value = getApiErrorMessage(cause)
        useUiStore().addToast({ type: 'error', title: 'Nie udało się pobrać statystyk dziennych', message: error.value })
      } finally {
        if (generation === requestGeneration) {
          isLoading.value = false
          pending = null
        }
      }
    })()
    return pending
  }

  return { data, vehicles, companyId, isLoading, error, load, resetApiState }
})
