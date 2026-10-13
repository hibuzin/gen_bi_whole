import styles from "./UIState.module.css";

function UIState({ type, message, onRetry }) {
  if (type === "loading") {
    return (
      <div className={styles.container}>
        <div className={styles.loader}></div>
        <p>{message || "Loading..."}</p>
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className={styles.container}>
        <p className={styles.error}> {message || "Something went wrong"}</p>
        {onRetry && (
          <button onClick={onRetry}>Retry</button>
        )}
      </div>
    );
  }

  if (type === "empty") {
    return (
      <div className={styles.container}>
        <p>{message || "No data found"}</p>
      </div>
    );
  }

  if (type === "success") {
    return (
      <div className={styles.container}>
        <p className={styles.success}>{message}</p>
      </div>
    );
  }

  return null;
}

export default UIState;