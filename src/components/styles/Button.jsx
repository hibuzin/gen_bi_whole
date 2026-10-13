import React from "react";

function Button({ text, variant = "primary", size = "md", onClick }) {
  
  const baseStyle = {
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "0.2s",
    fontWeight: "500",
  };

  const variants = {
    primary: {
      background: "#d4af37",
      color: "#000",
    },
    secondary: {
      background: "#2a2a2a",
      color: "#fff",
    },
    danger: {
      background: "#dc2626",
      color: "#fff",
    },
  };

  const sizes = {
    sm: {
      padding: "6px 10px",
      fontSize: "12px",
    },
    md: {
      padding: "10px 16px",
      fontSize: "13px",
    },
    lg: {
      padding: "14px 20px",
      fontSize: "15px",
    },
  };

  return (
    <button
      onClick={onClick}
      style={{
        ...baseStyle,
        ...variants[variant],
        ...sizes[size],
      }}
      onMouseOver={(e) => {
        if (variant === "primary") e.target.style.background = "#c19b2e";
        if (variant === "secondary") e.target.style.background = "#3a3a3a";
        if (variant === "danger") e.target.style.background = "#b91c1c";
      }}
      onMouseOut={(e) => {
        e.target.style.background = variants[variant].background;
      }}
    >
      {text}
    </button>
  );
}

export default Button;