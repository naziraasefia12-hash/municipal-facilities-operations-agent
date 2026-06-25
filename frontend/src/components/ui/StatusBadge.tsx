import { statusLabel } from '../../utils/formatters'

interface Props { status: string }

export function StatusBadge({ status }: Props) {
  return (
    <span className={`badge badge-${status}`}>
      {statusLabel(status)}
    </span>
  )
}
