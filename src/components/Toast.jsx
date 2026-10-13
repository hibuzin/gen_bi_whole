function Toast({ message, type }) {
  if (!message) return null;

    const style = {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 18px",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "500",
    backgroundColor:
      type === "success"
        ? "#16a34a"
        : "#ef4444",
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.18)",
    animation: "fadeIn 0.2s ease",
    zIndex: 999999,
  };

  return <div style={style}>{message}</div>;
}

export default Toast;