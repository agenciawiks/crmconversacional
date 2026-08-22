import React from 'react';

const TagBadge = React.memo(({ name, color, onDelete }) => {
  const badgeColor = color || '#9CA3AF'; // fallback to gray
  
  return (
    <span 
      className="kanban-card-tag"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        backgroundColor: `${badgeColor}18`, // 10% opacity background
        borderColor: `${badgeColor}40`,     // 25% opacity border
        color: badgeColor,
        border: '1px solid',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        transition: 'border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease, transform 0.2s ease'
      }}
    >
      {name}
      {onDelete && (
        <button
          type="button"
          aria-label={`Remover etiqueta ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ 
            cursor: 'pointer', 
            fontWeight: '700', 
            marginLeft: '4px', 
            color: 'inherit',
            opacity: 0.7,
            width: '18px',
            height: '18px',
            padding: 0,
            border: 0,
            borderRadius: '4px',
            background: 'transparent',
            lineHeight: 1
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.7}
        >
          ✕
        </button>
      )}
    </span>
  );
});

TagBadge.displayName = 'TagBadge';
export default TagBadge;
