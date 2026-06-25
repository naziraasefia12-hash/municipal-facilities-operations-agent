import { capitalize } from '../../utils/formatters'

interface Props { priority: string }

export function PriorityBadge({ priority }: Props) {
  return (
    <span className={`badge badge-${priority}`}>
      {capitalize(priority)}
    </span>
  )
}
