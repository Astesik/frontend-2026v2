import { api } from './api'
import type { Mechanic } from '@/types/repair'

export type MechanicCreatePayload = Pick<Mechanic, 'firstName'> & { lastName: string }
export type MechanicPayload = Partial<Pick<Mechanic, 'firstName' | 'lastName'>>

function normalizeMechanic(mechanic: Mechanic): Mechanic {
  const firstName = mechanic.firstName || ''
  const lastName = mechanic.lastName || ''
  const fullName = mechanic.fullName || [firstName, lastName].filter(Boolean).join(' ')

  return {
    ...mechanic,
    firstName,
    lastName,
    fullName,
  }
}

function createMechanicPayload(payload: MechanicCreatePayload) {
  return {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
  }
}

function patchMechanicPayload(payload: MechanicPayload) {
  const nextPayload: MechanicPayload = {}

  if (payload.firstName !== undefined) {
    nextPayload.firstName = payload.firstName?.trim() || ''
  }

  if (payload.lastName !== undefined) {
    nextPayload.lastName = payload.lastName?.trim() || ''
  }

  return nextPayload
}

export const mechanicService = {
  async getMechanics(options?: { silent?: boolean }) {
    const { data } = await api.get<Mechanic[]>('/api/mechanics', {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data.map(normalizeMechanic) : []
  },

  async createMechanic(payload: MechanicCreatePayload) {
    const { data } = await api.post<Mechanic>('/api/mechanics', createMechanicPayload(payload))
    return normalizeMechanic(data)
  },

  async updateMechanic(id: number | string, payload: MechanicPayload) {
    const { data } = await api.patch<Mechanic>(`/api/mechanics/${id}`, patchMechanicPayload(payload))
    return normalizeMechanic(data)
  },

  async deleteMechanic(id: number | string) {
    await api.delete(`/api/mechanics/${id}`)
  },
}
