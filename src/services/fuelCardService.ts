import { api } from './api'

export const fuelCardProviders = [
  { id: 'IDS', label: 'IDS' },
  { id: 'EUROWAG', label: 'Eurowag' },
  { id: 'E100', label: 'E100' },
  { id: 'AS24', label: 'AS24' },
] as const

export type FuelCardProvider = typeof fuelCardProviders[number]['id']

export interface FuelCardAssignment {
  id: number
  cardId: number
  provider: FuelCardProvider
  maskedNumber: string
  validFrom: string
  validTo: string | null
  voidedAt: string | null
}

export interface FuelCardIssue {
  id: number
  cardId: number
  holderName: string
  issuedAt: string
  returnedAt: string | null
}

export interface FuelCardHistory {
  assignments: FuelCardAssignment[]
  issues: FuelCardIssue[]
}

interface AssignmentRequest {
  provider: FuelCardProvider
  cardNumber: string
  validFrom: string
  validTo: string | null
}

const options = { skipErrorToast: true }
const url = (vehicleId: number) => `/api/fuel/vehicles/${vehicleId}/cards`

export const fuelCardService = {
  async history(vehicleId: number) {
    const { data } = await api.get<FuelCardHistory>(url(vehicleId), options)
    return data
  },
  async assign(vehicleId: number, assignment: AssignmentRequest) {
    await api.post(url(vehicleId), assignment, options)
  },
  async voidAssignment(vehicleId: number, assignmentId: number) {
    await api.delete(`${url(vehicleId)}/${assignmentId}`, options)
  },
  async end(vehicleId: number, assignmentId: number, at: string) {
    await api.patch(`${url(vehicleId)}/${assignmentId}/end`, { at }, options)
  },
  async issue(vehicleId: number, assignmentId: number, holderName: string, at: string, returnedAt: string | null) {
    await api.post(`${url(vehicleId)}/${assignmentId}/issues`, { holderName, at, returnedAt }, options)
  },
  async returnCard(vehicleId: number, assignmentId: number, issueId: number, at: string) {
    await api.patch(`${url(vehicleId)}/${assignmentId}/issues/${issueId}/return`, { at }, options)
  },
}
