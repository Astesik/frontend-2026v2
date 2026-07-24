import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationService } from '@/services/notificationService'
import type {
  CompanyMailSettings,
  CompanyMailSettingsPayload,
  CountryEventHistoryItem,
  CountryEventRule,
  CountryEventRulePayload,
} from '@/types/notifications'

export const useNotificationStore = defineStore('notifications', () => {
  const mailSettings = ref<CompanyMailSettings | null>(null)
  const countryRules = ref<CountryEventRule[]>([])
  const countryHistory = ref<CountryEventHistoryItem[]>([])
  const countryHistoryTotal = ref(0)
  const countryHistoryPage = ref(1)
  const countryHistoryPageSize = ref(10)
  const isLoadingMail = ref(false)
  const isLoadingCountryRules = ref(false)
  const isLoadingCountryHistory = ref(false)
  const isMutating = ref(false)

  async function loadMailSettings(options?: { silent?: boolean }) {
    isLoadingMail.value = true
    try {
      mailSettings.value = await notificationService.getMailSettings(options)
      return mailSettings.value
    } finally {
      isLoadingMail.value = false
    }
  }

  async function saveMailSettings(payload: CompanyMailSettingsPayload) {
    isMutating.value = true
    try {
      mailSettings.value = await notificationService.saveMailSettings(payload)
      return mailSettings.value
    } finally {
      isMutating.value = false
    }
  }

  async function testMailSettings(recipients: string[]) {
    isMutating.value = true
    try {
      await notificationService.testMailSettings(recipients)
    } finally {
      isMutating.value = false
    }
  }

  async function loadCountryRules(options?: { silent?: boolean }) {
    isLoadingCountryRules.value = true
    try {
      countryRules.value = await notificationService.getCountryRules(options)
      return countryRules.value
    } finally {
      isLoadingCountryRules.value = false
    }
  }

  async function saveCountryRule(payload: CountryEventRulePayload, id?: number | null) {
    isMutating.value = true
    try {
      const rule = id
        ? await notificationService.updateCountryRule(id, payload)
        : await notificationService.createCountryRule(payload)
      const index = countryRules.value.findIndex((item) => item.id === rule.id)
      if (index >= 0) countryRules.value.splice(index, 1, rule)
      else countryRules.value.push(rule)
      return rule
    } finally {
      isMutating.value = false
    }
  }

  async function deleteCountryRule(id: number) {
    isMutating.value = true
    try {
      await notificationService.deleteCountryRule(id)
      countryRules.value = countryRules.value.filter((rule) => rule.id !== id)
    } finally {
      isMutating.value = false
    }
  }

  async function loadCountryHistory(page = 0, size = 100, options?: { silent?: boolean }) {
    isLoadingCountryHistory.value = true
    try {
      const result = await notificationService.getCountryHistory(page, size, options)
      countryHistory.value = result.content
      countryHistoryTotal.value = result.totalElements
      countryHistoryPage.value = result.number + 1
      countryHistoryPageSize.value = result.size
      return result
    } finally {
      isLoadingCountryHistory.value = false
    }
  }

  function resetApiState() {
    mailSettings.value = null
    countryRules.value = []
    countryHistory.value = []
    countryHistoryTotal.value = 0
    countryHistoryPage.value = 1
    countryHistoryPageSize.value = 10
    isLoadingMail.value = false
    isLoadingCountryRules.value = false
    isLoadingCountryHistory.value = false
    isMutating.value = false
  }

  return {
    mailSettings,
    countryRules,
    countryHistory,
    countryHistoryTotal,
    countryHistoryPage,
    countryHistoryPageSize,
    isLoadingMail,
    isLoadingCountryRules,
    isLoadingCountryHistory,
    isMutating,
    loadMailSettings,
    saveMailSettings,
    testMailSettings,
    loadCountryRules,
    saveCountryRule,
    deleteCountryRule,
    loadCountryHistory,
    resetApiState,
  }
})
