import client from './client'
import type { Building } from '../types'

export const getBuildings = () => client.get<Building[]>('/buildings').then(r => r.data)
export const getBuilding = (id: number) => client.get<Building>(`/buildings/${id}`).then(r => r.data)
export const createBuilding = (data: Partial<Building>) => client.post<Building>('/buildings', data).then(r => r.data)
export const updateBuilding = (id: number, data: Partial<Building>) => client.patch<Building>(`/buildings/${id}`, data).then(r => r.data)
