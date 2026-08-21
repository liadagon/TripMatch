import { EXISTING_ACCOUNT_CONFIRMATION } from "../utils/authNavigation";

type ExistingAccountDialogProps = {
  isExiting: boolean;
  onContinue: () => void;
  onExit: () => void;
};

export default function ExistingAccountDialog({
  isExiting,
  onContinue,
  onExit,
}: ExistingAccountDialogProps) {
  return (
    <div className="existing-account-overlay">
      <section
        className="existing-account-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={isExiting}
        aria-labelledby="existing-account-title"
        aria-describedby="existing-account-message"
      >
        <div className="existing-account-icon" aria-hidden="true">
          ✓
        </div>
        <h2 id="existing-account-title">
          {EXISTING_ACCOUNT_CONFIRMATION.title}
        </h2>
        <p id="existing-account-message">
          {EXISTING_ACCOUNT_CONFIRMATION.message}
        </p>
        <button
          autoFocus
          type="button"
          className="existing-account-action"
          onClick={onContinue}
          disabled={isExiting}
        >
          {EXISTING_ACCOUNT_CONFIRMATION.actionLabel}
        </button>
        <button
          type="button"
          className="existing-account-exit"
          onClick={onExit}
          disabled={isExiting}
        >
          {isExiting ? "יוצאים..." : "יציאה"}
        </button>
      </section>
    </div>
  );
}
