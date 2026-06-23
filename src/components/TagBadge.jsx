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
        transition: 'all 0.2s ease'
      }}
    >
      {name}
      {onDelete && (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ 
            cursor: 'pointer', 
            fontWeight: '700', 
            marginLeft: '4px', 
            color: 'inherit',
            opacity: 0.7
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.7}
        >
          ✕
        </span>
      )}
    </span>
  );
});

TagBadge.displayName = 'TagBadge';
export default TagBadge;
