import React from 'react';

/**
 * Skeleton — comprehensive shimmer placeholder components for loading states.
 *
 * Usage:
 *   <Skeleton.Card />           — classroom card (pill + rounded body)
 *   <Skeleton.Row />            — user/student list row with avatar and details
 *   <Skeleton.AssignmentRow />  — taller assignment pill row
 *   <Skeleton.StreamCard />     — stream feed announcement / assignment card
 *   <Skeleton.ActivityDetail /> — full student activity detail view
 *   <Skeleton.Calendar />       — 7-day calendar view
 *   <Skeleton.Settings />       — settings section card
 *   <Skeleton.Grading />        — teacher grading pane
 *   <Skeleton />                — raw block, pass width/height/borderRadius
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

// Stream feed card: teacher avatar + date + body lines
Skeleton.StreamCard = function SkeletonStreamCard() {
  return (
    <div className="skeleton-stream-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton-shimmer skeleton-avatar" style={{ width: 38, height: 38 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton-shimmer skeleton-text-line" style={{ width: '40%', height: 14 }} />
          <div className="skeleton-shimmer skeleton-text-line" style={{ width: '22%', height: 10 }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 4 }}>
        <div className="skeleton-shimmer skeleton-text-line" style={{ width: '92%', height: 12 }} />
        <div className="skeleton-shimmer skeleton-text-line" style={{ width: '78%', height: 12 }} />
      </div>
    </div>
  );
};

// Full activity detail page skeleton
Skeleton.ActivityDetail = function SkeletonActivityDetail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Back button placeholder */}
      <div className="skeleton-shimmer" style={{ width: '160px', height: '24px', borderRadius: '6px' }} />

      {/* Activity title pill */}
      <div className="skeleton-shimmer" style={{ width: '380px', height: '42px', borderRadius: '50px' }} />

      {/* Meta row: points and due date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton-shimmer" style={{ width: '120px', height: '18px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '90px', height: '14px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-shimmer" style={{ width: '80px', height: '20px', borderRadius: '6px' }} />
      </div>

      {/* Large instruction box */}
      <div
        className="skeleton-shimmer"
        style={{ width: '100%', height: '240px', borderRadius: '24px' }}
      />

      {/* Bottom action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px' }}>
        <div className="skeleton-shimmer" style={{ width: '140px', height: '46px', borderRadius: '50px' }} />
        <div className="skeleton-shimmer" style={{ width: '140px', height: '46px', borderRadius: '50px' }} />
      </div>
    </div>
  );
};

// Weekly calendar skeleton
Skeleton.Calendar = function SkeletonCalendar() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', height: '100%' }}>
      {/* Header controls: dropdown + week navigator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-shimmer" style={{ width: '220px', height: '42px', borderRadius: '8px' }} />
        <div className="skeleton-shimmer" style={{ width: '240px', height: '36px', borderRadius: '8px' }} />
        <div style={{ width: '220px' }} />
      </div>

      {/* 7-column calendar grid */}
      <div className="skeleton-calendar-grid">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton-calendar-col">
            {/* Day name */}
            <div className="skeleton-shimmer" style={{ width: '40px', height: '12px', margin: '0 auto', borderRadius: '4px' }} />
            {/* Date circle */}
            <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto' }} />
            {/* Event pill placeholder */}
            {i % 2 === 0 && (
              <div className="skeleton-shimmer" style={{ width: '100%', height: '54px', borderRadius: '6px', marginTop: '12px' }} />
            )}
            {i === 3 && (
              <div className="skeleton-shimmer" style={{ width: '100%', height: '54px', borderRadius: '6px', marginTop: '6px' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Settings section card skeleton
Skeleton.Settings = function SkeletonSettings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '720px' }}>
      {/* Header icon + titles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div className="skeleton-shimmer" style={{ width: '200px', height: '22px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ width: '360px', height: '14px', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Form inputs grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton-shimmer" style={{ width: '90px', height: '12px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '100%', height: '44px', borderRadius: '12px' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Grading view skeleton
Skeleton.Grading = function SkeletonGrading() {
  return (
    <div style={{ display: 'flex', gap: '24px', width: '100%', height: '100%' }}>
      {/* Student list pane */}
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="skeleton-shimmer" style={{ width: '100%', height: '42px', borderRadius: '10px' }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ width: '100%', height: '56px', borderRadius: '12px' }} />
        ))}
      </div>

      {/* Code preview & feedback pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton-shimmer" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
        <div className="skeleton-shimmer" style={{ width: '100%', height: '360px', borderRadius: '16px' }} />
        <div className="skeleton-shimmer" style={{ width: '100%', height: '80px', borderRadius: '12px' }} />
      </div>
    </div>
  );
};

export default Skeleton;
