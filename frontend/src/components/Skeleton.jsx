/**
 * Skeleton — shimmer placeholder components for loading states.
 *
 * Usage:
 *   <Skeleton.Card />           — classroom card (pill + square body)
 *   <Skeleton.Row />            — user/assignment list row
 *   <Skeleton.AssignmentRow />  — taller assignment pill row
 *   <Skeleton />                — raw block, pass style/className props
 */

// Raw block
function Skeleton({ width = '100%', height = 16, borderRadius = 8, style = {}, className = '' }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

// Classroom card: pill label on top + card body beneath
Skeleton.Card = function SkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Pill */}
      <div className="skeleton-shimmer skeleton-card-pill" />
      {/* Card body */}
      <div className="skeleton-shimmer skeleton-card-body" />
    </div>
  );
};

// Generic list row: avatar circle + two text lines + action pill
Skeleton.Row = function SkeletonRow({ cols = 7 }) {
  // For table-style rows (UserManagement), render a pill-row layout
  return (
    <div className="skeleton-row">
      {/* Avatar / checkbox placeholder */}
      <div className="skeleton-shimmer skeleton-avatar" />
      {/* Text group */}
      <div className="skeleton-text-group">
        <div className="skeleton-shimmer skeleton-text-line" style={{ width: '55%' }} />
        <div className="skeleton-shimmer skeleton-text-line" style={{ width: '35%' }} />
      </div>
      {/* Role pill */}
      <div className="skeleton-shimmer skeleton-action-pill" style={{ width: 50, marginRight: 4 }} />
      {/* Status pill */}
      <div className="skeleton-shimmer skeleton-action-pill" style={{ width: 54 }} />
    </div>
  );
};

// Assignment pill: full-width tall pill matching the assignment list style
Skeleton.AssignmentRow = function SkeletonAssignmentRow() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div
        className="skeleton-shimmer skeleton-assignment-pill"
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default Skeleton;
