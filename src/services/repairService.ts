import { api } from './api'
import type {
  Repair,
  RepairComment,
  RepairFault,
  RepairFaultComment,
  RepairFaultPhoto,
  RepairFaultStatus,
  RepairFaultPayload,
  RepairFaultUpdatePayload,
  RepairPayload,
  RepairPhoto,
  RepairStatus,
  RepairUpdatePayload,
  RepairWeek,
  RepairWeeksResponse,
} from '@/types/repair'

export type VehicleRepairHistoryItem = Repair & {
  id?: number | string | null
  number?: number | string | null
  title?: string | null
  status?: string
  place?: string | null
  description?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  faults?: Array<string | { name?: string | null; description?: string | null }>
  [key: string]: unknown
}

function normalizeComment(comment: RepairComment): RepairComment {
  return {
    ...comment,
    content: comment.content || comment.text || '',
  }
}

function normalizeFaultComment(comment: RepairFaultComment): RepairFaultComment {
  const rawComment = comment as RepairFaultComment & {
    content?: string | null
    createdByUsername?: string | null
    username?: string | null
    createdBy?: number | { id?: number; username?: string | null } | null
  }
  const createdBy = rawComment.createdBy
  const createdById = typeof createdBy === 'number'
    ? createdBy
    : typeof createdBy === 'object' && createdBy
      ? Number(createdBy.id)
      : null

  return {
    ...comment,
    userId: comment.userId ?? createdById,
    username: comment.username || rawComment.createdByUsername || (typeof createdBy === 'object' && createdBy ? createdBy.username || null : null),
    text: comment.text || rawComment.content || '',
  }
}

function normalizeFaultPhoto(photo: RepairFaultPhoto): RepairFaultPhoto {
  return {
    ...photo,
    uploadedBy: photo.uploadedBy || null,
  }
}

function normalizeRepairStatus(status: string | null | undefined): RepairStatus {
  const normalized = String(status || 'new').trim()
  const lower = normalized.toLowerCase()

  if (lower === 'in_field' || lower === 'infield') {
    return 'IN_FIELD'
  }

  if (lower === 'ready_to_be_repaired') {
    return 'ready_to_be_repaired'
  }

  if (lower === 'at_location') {
    return 'at_location'
  }

  if (['new', 'planned', 'done', 'cancelled'].includes(lower)) {
    return lower as RepairStatus
  }

  return 'new'
}

function normalizeFaultStatus(status: string | null | undefined): RepairFaultStatus {
  return String(status || '').trim().toLowerCase() === 'done' ? 'DONE' : 'OPEN'
}

function mechanicFullName(mechanic: unknown) {
  if (!mechanic || typeof mechanic !== 'object') {
    return null
  }

  const value = mechanic as Record<string, unknown>
  const fullName = typeof value.fullName === 'string' ? value.fullName : ''
  const firstName = typeof value.firstName === 'string' ? value.firstName : ''
  const lastName = typeof value.lastName === 'string' ? value.lastName : ''
  return fullName || [firstName, lastName].filter(Boolean).join(' ') || null
}

function mechanicId(mechanic: unknown) {
  if (!mechanic || typeof mechanic !== 'object') {
    return null
  }

  const id = Number((mechanic as Record<string, unknown>).id)
  return Number.isFinite(id) ? id : null
}

function normalizeFault(fault: RepairFault): RepairFault {
  const rawFault = fault as RepairFault & {
    assignedMechanic?: unknown
    completedByMechanic?: unknown
    performedByMechanic?: unknown
    repairedAt?: string | null
    updatedAt?: string | null
    comments?: RepairFaultComment[] | null
    photos?: RepairFaultPhoto[] | null
  }
  const assignedMechanic = rawFault.assignedMechanic
  const completedMechanic = rawFault.completedByMechanic || rawFault.performedByMechanic

  return {
    ...fault,
    status: normalizeFaultStatus(fault.status),
    note: fault.note || null,
    assignedMechanicId: fault.assignedMechanicId ?? mechanicId(assignedMechanic),
    assignedMechanicFullName: fault.assignedMechanicFullName || mechanicFullName(assignedMechanic),
    performedByMechanicId: fault.performedByMechanicId ?? mechanicId(completedMechanic),
    performedByMechanicFullName: fault.performedByMechanicFullName || mechanicFullName(completedMechanic),
    resolvedAt: fault.resolvedAt || rawFault.repairedAt || null,
    repairedAt: rawFault.repairedAt || null,
    updatedAt: rawFault.updatedAt || null,
    comments: Array.isArray(rawFault.comments) ? rawFault.comments.map(normalizeFaultComment) : [],
    photos: Array.isArray(rawFault.photos) ? rawFault.photos.map(normalizeFaultPhoto) : [],
  }
}

function normalizeRepair(repair: Repair): Repair {
  const rawRepair = repair as Repair & {
    createdBy?: number | { id?: number; username?: string | null } | null
    photos?: RepairPhoto[] | null
  }
  const faults = Array.isArray(repair.faults) ? repair.faults.map(normalizeFault) : []
  const doneFaults = typeof repair.doneFaults === 'number'
    ? repair.doneFaults
    : faults.filter((fault) => fault.status === 'DONE').length
  const totalFaults = typeof repair.totalFaults === 'number' ? repair.totalFaults : faults.length
  const createdByUsername = repair.createdByUsername
    || (typeof rawRepair.createdBy === 'object' && rawRepair.createdBy ? rawRepair.createdBy.username || null : null)
    || null
  const createdBy = typeof rawRepair.createdBy === 'object' && rawRepair.createdBy
    ? {
        id: Number(rawRepair.createdBy.id),
        username: rawRepair.createdBy.username || null,
      }
    : typeof rawRepair.createdBy === 'number'
      ? { id: rawRepair.createdBy, username: createdByUsername }
      : null

  return {
    ...repair,
    vehicleId: repair.vehicleId ?? repair.vehicle?.id ?? 0,
    vehicleLicensePlate: repair.vehicleLicensePlate ?? repair.vehicle?.licensePlate ?? null,
    placeId: repair.placeId ?? repair.place?.id ?? null,
    placeName: repair.placeName ?? repair.place?.name ?? null,
    status: normalizeRepairStatus(repair.status),
    description: repair.description || null,
    createdBy,
    createdByUsername,
    faults,
    totalFaults,
    doneFaults,
    comments: repair.comments?.map(normalizeComment),
    photos: Array.isArray(rawRepair.photos) ? rawRepair.photos : [],
  }
}

function normalizeWeek(week: RepairWeek): RepairWeek {
  return {
    ...week,
    repairs: Array.isArray(week.repairs) ? week.repairs.map(normalizeRepair) : [],
  }
}

export const repairService = {
  async getRepairs(params?: { vehicleId?: number | string; status?: string }, options?: { silent?: boolean }) {
    const { data } = await api.get<Repair[]>('/api/repairs', {
      params,
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data.map(normalizeRepair) : []
  },

  async getRepair(repairId: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<Repair>(`/api/repairs/${repairId}`, {
      skipErrorToast: options?.silent,
    })
    return normalizeRepair(data)
  },

  async getRepairWeeks(options?: { silent?: boolean }) {
    const { data } = await api.get<RepairWeeksResponse>('/api/repairs/weeks', {
      skipErrorToast: options?.silent,
    })
    return {
      fieldAndUnassigned: Array.isArray(data.fieldAndUnassigned) ? data.fieldAndUnassigned.map(normalizeRepair) : [],
      weeks: Array.isArray(data.weeks) ? data.weeks.map(normalizeWeek) : [],
    }
  },

  async createRepair(payload: RepairPayload) {
    const { data } = await api.post<Repair>('/api/repairs', payload)
    return normalizeRepair(data)
  },

  async updateRepair(repairId: number | string, payload: RepairUpdatePayload) {
    const { data } = await api.patch<Repair>(`/api/repairs/${repairId}`, payload)
    return normalizeRepair(data)
  },

  async deleteRepair(repairId: number | string) {
    await api.delete(`/api/repairs/${repairId}`)
  },

  async uploadRepairPhoto(repairId: number | string, file: File) {
    const formData = new FormData()
    formData.append('file', file, file.name)

    const { data } = await api.post<RepairPhoto>(`/api/repairs/${repairId}/photos`, formData)
    return data
  },

  async loadRepairPhoto(photo: RepairPhoto, options?: { silent?: boolean }) {
    const response = await api.get<Blob>(photo.url, {
      responseType: 'blob',
      skipErrorToast: options?.silent,
    })

    return URL.createObjectURL(response.data)
  },

  async deleteRepairPhoto(repairId: number | string, photoId: number | string) {
    await api.delete(`/api/repairs/${repairId}/photos/${photoId}`)
  },

  async getVehicleRepairHistory(vehicleId: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<VehicleRepairHistoryItem[]>(
      `/api/repairs/vehicle/${vehicleId}/history`,
      {
        skipErrorToast: options?.silent,
      },
    )

    return Array.isArray(data) ? data.map(normalizeRepair) : []
  },

  async getRepairComments(repairId: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<RepairComment[]>(`/api/repairs/${repairId}/comments`, {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data.map(normalizeComment) : []
  },

  async addRepairComment(repairId: number | string, text: string) {
    const { data } = await api.post<RepairComment>(`/api/repairs/${repairId}/comments`, { text })
    return normalizeComment(data)
  },

  async addRepairFault(repairId: number | string, payload: RepairFaultPayload) {
    const { data } = await api.post<RepairFault>(`/api/repairs/${repairId}/faults`, payload)
    return normalizeFault(data)
  },

  async updateRepairFault(repairId: number | string, faultId: number | string, payload: RepairFaultUpdatePayload) {
    const { data } = await api.patch<RepairFault>(`/api/repairs/${repairId}/faults/${faultId}`, payload)
    return normalizeFault(data)
  },

  async deleteRepairFault(repairId: number | string, faultId: number | string) {
    await api.delete(`/api/repairs/${repairId}/faults/${faultId}`)
  },

  async getRepairFaultComments(repairId: number | string, faultId: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<RepairFaultComment[]>(`/api/repairs/${repairId}/faults/${faultId}/comments`, {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data.map(normalizeFaultComment) : []
  },

  async addRepairFaultComment(repairId: number | string, faultId: number | string, text: string) {
    const { data } = await api.post<RepairFaultComment>(`/api/repairs/${repairId}/faults/${faultId}/comments`, { text })
    return normalizeFaultComment(data)
  },

  async uploadRepairFaultPhoto(repairId: number | string, faultId: number | string, file: File) {
    const formData = new FormData()
    formData.append('file', file, file.name)

    const { data } = await api.post<RepairFaultPhoto>(`/api/repairs/${repairId}/faults/${faultId}/photos`, formData)
    return normalizeFaultPhoto(data)
  },

  async loadRepairFaultPhoto(photo: RepairFaultPhoto, options?: { silent?: boolean }) {
    const response = await api.get<Blob>(photo.url, {
      responseType: 'blob',
      skipErrorToast: options?.silent,
    })

    return URL.createObjectURL(response.data)
  },

  async deleteRepairFaultPhoto(repairId: number | string, faultId: number | string, photoId: number | string) {
    await api.delete(`/api/repairs/${repairId}/faults/${faultId}/photos/${photoId}`)
  },
}
