import React, { useState } from 'react';
import { Maximize2, AlertCircle, Download, Film } from 'lucide-react';

/**
 * VideoAttachment
 * Plays MP4, WebM, and MOV videos cleanly with direct src playback,
 * controls, and expand-to-lightbox capability.
 */
export default function VideoAttachment({ att, onExpand, style = {} }) {
  const [loadError, setLoadError] = useState(false);

  if (!att) return null;

  const url = att.url || '';
  const name = att.name || 'Video Attachment';

  if (!url) {
    return (
      <div
        style={{
          ...defaultStyles.placeholderCard,
          ...style
        }}
      >
        <Film size={20} color="#94A3B8" />
        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{name} (Processing...)</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          onError={() => setLoadError(true)}
          style={{
            ...defaultStyles.video,
            ...style
          }}
        >
          Your browser does not support playing this video.
        </video>

        {onExpand && (
          <button
            type="button"
            onClick={() => onExpand(att)}
            style={defaultStyles.expandBtn}
            title="Open video in pop-up"
          >
            <Maximize2 size={13} />
          </button>
        )}
      </div>

      {loadError && (
        <div style={defaultStyles.errorNotice}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={13} color="#F59E0B" />
            <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>Cannot preview in browser</span>
          </div>
          <a
            href={url}
            download={name}
            style={defaultStyles.downloadLink}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={11} style={{ marginRight: '3px' }} /> Download
          </a>
        </div>
      )}
    </div>
  );
}

const defaultStyles = {
  video: {
    width: '260px',
    maxWidth: '100%',
    maxHeight: '160px',
    borderRadius: '8px',
    backgroundColor: '#000000',
    display: 'block',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
  },
  expandBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    color: '#FFFFFF',
    padding: '5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.15s ease',
    zIndex: 2
  },
  placeholderCard: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  errorNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: '#1E293B',
    borderRadius: '6px',
    border: '1px solid #334155',
    width: '260px',
    maxWidth: '100%',
    boxSizing: 'border-box'
  },
  downloadLink: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '600',
    textDecoration: 'none'
  }
};
