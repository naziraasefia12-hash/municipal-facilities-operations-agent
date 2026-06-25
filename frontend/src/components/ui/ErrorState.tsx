interface Props { message?: string; onRetry?: () => void }

export function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <div className="error-state">
      <div className="error-state-title">Error</div>
      <div>{message}</div>
      {onRetry && (
        <span className="error-state-retry" onClick={onRetry}>
          Try again →
        </span>
      )}
    </div>
  )
}
