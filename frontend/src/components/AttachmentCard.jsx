import React, { useState } from 'react';
import { Play, Globe, FileText, X } from 'lucide-react';

/**
 * AttachmentCard
 * Matches the Google Classroom attachment card format:
 * - Left side: Title/filename (underlined) + Type subtitle (Image, Video, URL)
 * - Right side: Visual preview thumbnail separated by a vertical divider
 * - Optional remove (X) button for creation/edit modals
 */
export default function AttachmentCard({
  att,
  onClick,
  onRemove,
  isDark = false,
  style = {}
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  if (!att) return null;

  const type = att.type || 'file';
  const name = att.name || (type === 'link' ? att.url : 'Attachment');
  const url = att.url || '';

  // Ensure link URLs always have http:// or https:// so they open external sites
  const targetUrl = url ? (url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`) : '#';

  let typeLabel = 'File';
  if (type === 'image') typeLabel = 'Image';
  else if (type === 'video') typeLabel = 'Video';
  else if (type === 'link') typeLabel = url || 'Link';
  else if (att.name?.includes('.')) {
    const ext = att.name.split('.').pop()?.toUpperCase();
    typeLabel = ext ? `${ext} File` : 'File';
  }

  const handleClick = (e) => {
    if (type === 'link' && targetUrl !== '#') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (onClick) onClick(att);
      return;
    }
    if (onClick) {
      onClick(att);
    }
  };

  const cardStyle = {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    height: '68px',
    minHeight: '68px',
    maxHeight: '68px',
    backgroundColor: isDark ? (isHovered ? '#383838' : '#303030') : (isHovered ? '#f9fafb' : '#ffffff'),
    border: isDark ? '1px solid #4A4A4A' : '1px solid #dadce0',
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.15s ease',
    boxShadow: isHovered 
      ? (isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.08)')
      : 'none',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '340px',
    minWidth: '220px',
    flex: '1 1 240px',
    textDecoration: 'none',
    color: 'inherit',
    ...style
  };

  const leftContentStyle = {
    flex: 1,
    minWidth: 0,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden'
  };

  const titleStyle = {
    fontSize: '0.86rem',
    fontWeight: '600',
    color: isDark ? '#E8EAED' : '#1f2937',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.3
  };

  const subStyle = {
    fontSize: '0.74rem',
    color: isDark ? '#9CA3AF' : '#5f6368',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '4px',
    lineHeight: 1.2
  };

  const rightThumbBoxStyle = {
    width: '74px',
    minWidth: '74px',
    maxWidth: '74px',
    height: '100%',
    borderLeft: isDark ? '1px solid #4A4A4A' : '1px solid #dadce0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#242424' : '#f8fafc',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0
  };

  const removeBtnStyle = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    zIndex: 10,
    background: isDark ? 'rgba(40,40,40,0.85)' : 'rgba(255,255,255,0.9)',
    border: isDark ? '1px solid #5A5A5A' : '1px solid #d1d5db',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: isDark ? '#e5e7eb' : '#4b5563',
    padding: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
  };

  const cardContent = (
    <>
      {/* Optional Remove Button */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(att);
          }}
          style={removeBtnStyle}
          title="Remove attachment"
        >
          <X size={12} />
        </button>
      )}

      {/* Left side: Filename / title & Type */}
      <div style={leftContentStyle}>
        <div style={titleStyle} title={name}>
          {name}
        </div>
        <div style={subStyle} title={typeLabel}>
          {typeLabel}
        </div>
      </div>

      {/* Right side: Thumbnail preview */}
      <div style={rightThumbBoxStyle}>
        {type === 'image' && url && !mediaError ? (
          <img
            src={url}
            alt=""
            onError={() => setMediaError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : type === 'video' && url && !mediaError ? (
          <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              src={url}
              muted
              playsInline
              preload="metadata"
              onError={() => setMediaError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }}
            />
            <div style={{
              position: 'absolute',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Play size={13} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '1px' }} />
            </div>
          </div>
        ) : type === 'link' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#10b981' }}>
            <Globe size={26} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: isDark ? '#9CA3AF' : '#64748b' }}>
            <FileText size={26} />
          </div>
        )}
      </div>
    </>
  );

  // If link, render as native <a> tag for instant navigation and popup-blocker immunity
  if (type === 'link') {
    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={name}
        onClick={(e) => {
          if (onClick) onClick(att);
        }}
      >
        {cardContent}
      </a>
    );
  }

  // Otherwise render clickable card for images, videos, files
  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={name}
    >
      {cardContent}
    </div>
  );
}
