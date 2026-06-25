import client from './client'
import type { Team, TeamWorkload } from '../types'

export const getTeams = () => client.get<Team[]>('/teams').then(r => r.data)
export const getTeam = (id: number) => client.get<Team>(`/teams/${id}`).then(r => r.data)
export const getTeamWorkload = (id: number) => client.get<TeamWorkload>(`/teams/${id}/workload`).then(r => r.data)
export const createTeam = (data: Partial<Team>) => client.post<Team>('/teams', data).then(r => r.data)
export const updateTeam = (id: number, data: Partial<Team>) => client.patch<Team>(`/teams/${id}`, data).then(r => r.data)
