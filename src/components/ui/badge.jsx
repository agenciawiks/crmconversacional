import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  const styles = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '100px',
    border: '1px solid transparent',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  let variantStyle = {};
  if (variant === "default") {
    variantStyle = {
      background: 'rgba(168, 85, 247, 0.12)',
      color: 'var(--accent-primary)',
      borderColor: 'rgba(168, 85, 247, 0.2)'
    };
  } else if (variant === "outline") {
    variantStyle = {
      border: '1px solid var(--border-glass)',
      color: 'var(--text-primary)'
    };
  } else if (variant === "success") {
    variantStyle = {
      background: 'rgba(16, 185, 129, 0.12)',
      color: 'var(--color-status-won)',
      borderColor: 'rgba(16, 185, 129, 0.2)'
    };
  }

  return (
    <div
      className={cn("badge", className)}
      style={{ ...styles, ...variantStyle }}
      {...props}
    />
  );
}

export { Badge }
