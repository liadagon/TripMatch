import "./LoadingState.css";

type LoadingStateProps = {
  message: string;
  fullScreen?: boolean;
};

/** Provides the shared accessible loading presentation for pages and sections. */
export default function LoadingState({
  message,
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <div
      className={`tripmatch-loading-state${fullScreen ? " full-screen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="tripmatch-loading-card">
        <div className="tripmatch-loading-brand" dir="ltr" aria-label="TripMatch">
          Trip<span>Match</span>
        </div>
        <span className="tripmatch-loading-spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}
