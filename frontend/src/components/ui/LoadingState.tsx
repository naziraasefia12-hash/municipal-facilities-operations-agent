interface Props { message?: string }

export function LoadingState({ message = 'Loading…' }: Props) {
  return (
    <div className="loading-state">
      <span className="spinner" />
      <span>{message}</span>
    </div>
  )
}
