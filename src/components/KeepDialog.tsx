import { useEffect, useState } from 'react'

/**
 * "Keep changes?" fail-safe. Shown right after Apply: if the user doesn't
 * confirm within TIMEOUT_SECONDS the change auto-reverts — same pattern as
 * OS display-settings dialogs, so a theme that renders text invisible can't
 * strand the user.
 */
export const TIMEOUT_SECONDS = 10

interface KeepDialogProps {
  onKeep: () => void
  onRevert: () => void
}

export default function KeepDialog({ onKeep, onRevert }: KeepDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) {
      onRevert()
      return
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, onRevert])

  return (
    <div className="keep-dialog" role="alertdialog" aria-live="assertive">
      <div className="keep-dialog__box">
        <h3>Keep these changes?</h3>
        <p>
          Reverting in <strong className="keep-dialog__count">{secondsLeft}</strong> second{secondsLeft === 1 ? '' : 's'}…
        </p>
        <div className="keep-dialog__bar">
          <div className="keep-dialog__bar-fill" style={{ width: `${(secondsLeft / TIMEOUT_SECONDS) * 100}%` }} />
        </div>
        <div className="keep-dialog__actions">
          <button autoFocus className="btn btn--primary" onClick={onKeep} type="button">
            Keep changes
          </button>
          <button className="btn" onClick={onRevert} type="button">
            Revert now
          </button>
        </div>
      </div>
    </div>
  )
}
