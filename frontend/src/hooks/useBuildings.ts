import { useQuery } from '@tanstack/react-query'
import { getBuildings } from '../api/buildings'

export function useBuildings() {
  return useQuery({ queryKey: ['buildings'], queryFn: getBuildings })
}
