// src/components/Button.jsx
export default function Button({ children, variant = "default", className = "", onClick, style }) {
  // Map variants to project CSS classes (no Tailwind)
  const variantClasses = {
    default: "btn",
    ghost: "nav-btn",
    outline: "btn-outline",
    danger: "btn", // can be extended with a .btn-danger if needed
  };

  const classes = [variantClasses[variant] || "", className].filter(Boolean).join(" ");

  return (
    <button className={classes} onClick={onClick} style={style}>
      {children}
    </button>
  );
}
