import { api } from './api'
import type {
  CompanyMailSettings,
  CompanyMailSettingsPayload,
  CountryEventHistoryItem,
  CountryEventRule,
  CountryEventRulePayload,
  PageResult,
} from '@/types/notifications'

function normalizeCountryCode(value: string | null | undefined) {
  const code = String(value || '').trim().toUpperCase()
  return code === 'UK' ? 'GB' : code
}

function normalizeRule(rule: CountryEventRule): CountryEventRule {
  return {
    ...rule,
    countryCode: normalizeCountryCode(rule.countryCode),
    recipients: Array.isArray(rule.recipients) ? [...new Set(rule.recipients.map((email) => email.trim().toLowerCase()).filter(Boolean))] : [],
  }
}

function normalizePage<T>(data: PageResult<T> | T[], page: number, size: number): PageResult<T> {
  if (Array.isArray(data)) {
    return { content: data, totalElements: data.length, totalPages: 1, number: page, size }
  }

  return {
    content: Array.isArray(data?.content) ? data.content : [],
    totalElements: Number(data?.totalElements || 0),
    totalPages: Number(data?.totalPages || 0),
    number: Number(data?.number ?? page),
    size: Number(data?.size ?? size),
  }
}

export const notificationService = {
  async getMailSettings(options?: { silent?: boolean }) {
    const { data } = await api.get<CompanyMailSettings>('/api/company-settings/mail', { skipErrorToast: options?.silent })
    return data
  },

  async saveMailSettings(payload: CompanyMailSettingsPayload) {
    const { data } = await api.put<CompanyMailSettings>('/api/company-settings/mail', payload)
    return data
  },

  async testMailSettings(recipients: string[]) {
    await api.post('/api/company-settings/mail/test', { recipients })
  },

  async getCountryRules(options?: { silent?: boolean }) {
    const { data } = await api.get<CountryEventRule[]>('/api/country-events/rules', { skipErrorToast: options?.silent })
    return (Array.isArray(data) ? data : []).map(normalizeRule)
  },

  async createCountryRule(payload: CountryEventRulePayload) {
    const { data } = await api.post<CountryEventRule>('/api/country-events/rules', payload)
    return normalizeRule(data)
  },

  async updateCountryRule(id: number, payload: CountryEventRulePayload) {
    const { data } = await api.put<CountryEventRule>(`/api/country-events/rules/${id}`, payload)
    return normalizeRule(data)
  },

  async deleteCountryRule(id: number) {
    await api.delete(`/api/country-events/rules/${id}`)
  },

  async getCountryHistory(page = 0, size = 100, options?: { silent?: boolean }) {
    const { data } = await api.get<PageResult<CountryEventHistoryItem> | CountryEventHistoryItem[]>('/api/country-events/history', {
      params: { page, size },
      skipErrorToast: options?.silent,
    })
    const result = normalizePage(data, page, size)
    result.content = result.content.map((item) => ({
      ...item,
      countryCode: normalizeCountryCode(item.countryCode),
      previousCountryCode: item.previousCountryCode ? normalizeCountryCode(item.previousCountryCode) : null,
      notificationRecipients: Array.isArray(item.notificationRecipients) ? item.notificationRecipients : [],
    }))
    return result
  },
}
