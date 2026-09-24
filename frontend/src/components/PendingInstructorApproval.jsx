import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useDarkMode } from '../hooks/useDarkMode';

// API configuration
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PendingInstructorApproval({ users, onUpdateUser, onActionLogged }) {
  const { isDark } = useDarkMode();
  const styles = getStyles(isDark);

  // Filter users with role "Instructor" and status "Pending"
  const [pendingInstructors, setPendingInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionPopup, setActionPopup] = useState(null); // { name: string, type: 'approve' | 'decline' }
  const [isSeeAllOpen, setIsSeeAllOpen] = useState(false);

  useEffect(() => {
    const filterPendingInstructors = () => {
      try {
        const filtered = users.filter(
          user =>
            user.role === 'Teacher' &&
            user.status === 'Pending'
        );
        setPendingInstructors(filtered);
        setError(null);
      } catch (err) {
        console.error('Error filtering pending instructors:', err);
        setError('Could process pending approvals data.');
        setPendingInstructors([]);
      } finally {
        setLoading(false);
      }
    };

    filterPendingInstructors();
  }, [users]);

  const handleApprove = async (email) => {
    // Optimistically remove from list immediately
    setPendingInstructors(prev => prev.filter(i => (i.emailAddress || i.email) !== email));
    try {
      const response = await apiFetch(`${API}/users/${encodeURIComponent(email)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' })
      });

      if (!response.ok) {
        throw new Error(`Failed to approve user: ${response.status}`);
      }

      // Show success popup
      const instructor = pendingInstructors.find(i => (i.emailAddress || i.email) === email);
      const name = instructor?.name || instructor?.fullName || email.split('@')[0];
      setActionPopup({ name, type: 'approve' });
      setTimeout(() => setActionPopup(null), 2500);

      // Log the action
      if (onActionLogged) {
        onActionLogged({
          type: 'APPROVE_INSTRUCTOR',
          email,
          timestamp: new Date().toISOString(),
          message: `Instructor approved and set to Active status`
        });
      }
    } catch (err) {
      console.error('Error approving instructor:', err);
      throw err;
    }
  };

  const handleReject = async (email) => {
    // Optimistically remove from list immediately
    setPendingInstructors(prev => prev.filter(i => (i.emailAddress || i.email) !== email));
    try {
      // Instead of changing status, completely delete the pending account
      const response = await apiFetch(`${API}/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to reject user: ${response.status}`);
      }

      // Show decline popup
      const instructor = pendingInstructors.find(i => (i.emailAddress || i.email) === email);
      const name = instructor?.name || instructor?.fullName || email.split('@')[0];
      setActionPopup({ name, type: 'decline' });
      setTimeout(() => setActionPopup(null), 2500);

      // Log the action
      if (onActionLogged) {
        onActionLogged({
          type: 'REJECT_INSTRUCTOR',
          email,
          timestamp: new Date().toISOString(),
          message: `Instructor rejected and account deleted`
        });
      }
    } catch (err) {
      console.error('Error rejecting instructor:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        Loading pending approvals...
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        {error}
      </div>
    );
  }

  const displayedInstructors = pendingInstructors.slice(0, 3);

  const renderInstructor = (instructor) => {
    const email = instructor.emailAddress || instructor.email || '';
    const name = instructor.name || instructor.fullName || (email ? email.split('@')[0] : 'Instructor');
    const initial = name.charAt(0).toUpperCase() || '?';

    return (
      <div
        key={email}
        style={styles.pillRow}
      >
        <div style={styles.leftInfo}>
          <div style={styles.avatar}>
            {initial}
          </div>
          <div style={styles.textColumn}>
            <span style={styles.displayName}>{name}</span>
            <span style={styles.displayEmail}>{email}</span>
          </div>
        </div>

        <div style={styles.actionsGroup}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleApprove(email)}
            style={styles.acceptButton}
          >
            Accept
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleReject(email)}
            style={styles.declineButton}
          >
            Decline
          </motion.button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.cardContainer}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Pending Instructor Approval</h2>
        {pendingInstructors.length > 3 && (
          <button
            style={styles.seeAllBtn}
            onClick={() => setIsSeeAllOpen(true)}
          >
            See All
          </button>
        )}
      </div>

      {pendingInstructors.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H16L20 16V6C20 4.89543 19.1046 4 20 4Z" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 6H20" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 10H20" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 14H20" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={styles.emptyText}>
            No pending instructor approvals.
          </p>
          <p style={styles.emptyHint}>
            New instructors requesting approval will appear here.
          </p>
        </div>
      ) : (
        <div style={styles.listContainer}>
          {displayedInstructors.map(renderInstructor)}
        </div>
      )}

      <AnimatePresence>
        {isSeeAllOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setIsSeeAllOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>All Pending Instructors ({pendingInstructors.length})</h2>
                <button
                  onClick={() => setIsSeeAllOpen(false)}
                  style={styles.closeBtn}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#3a3a3a' : '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  &times;
                </button>
              </div>
              
              <div style={styles.modalListContainer}>
                {pendingInstructors.map(renderInstructor)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Action Popup */}
      <AnimatePresence>
        {actionPopup && (
          <motion.div
            key="action-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.popupOverlay}
          >
            <motion.div
              key="action-card"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              style={styles.popupCard}
            >
              <div style={styles.popupIconRing}>
                {actionPopup.type === 'approve' ? (
                  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill={isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7"} />
                    <path
                      d="M11 20.5L17 27L29 14"
                      stroke={isDark ? "#4ade80" : "#16a34a"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill={isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2"} />
                    <path
                      d="M14 14L26 26M26 14L14 26"
                      stroke={isDark ? "#f87171" : "#dc2626"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p style={styles.popupTitle}>{actionPopup.type === 'approve' ? 'Instructor Approved' : 'Instructor Declined'}</p>
                <p style={styles.popupSub}>
                  {actionPopup.type === 'approve' ? (
                    <><strong>{actionPopup.name}</strong> has been granted access as an instructor.</>
                  ) : (
                    <><strong>{actionPopup.name}</strong>'s request has been rejected.</>
                  )}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Styles matching exact UI screenshot specifications with dark mode support
const getStyles = (isDark) => ({
  cardContainer: {
    backgroundColor: isDark ? '#2c2c2c' : '#ffffff',
    borderRadius: '24px',
    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
    padding: '18px 20px',
    width: '100%',
    boxSizing: 'border-box',
    border: isDark ? '1px solid #3a3a3a' : 'none',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  title: {
    margin: 0,
    fontSize: '0.88rem',
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#1e293b',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
  },
  seeAllBtn: {
    background: 'none',
    border: 'none',
    color: isDark ? '#60a5fa' : '#3b82f6',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 8px',
    outline: 'none',
    borderRadius: '12px',
    transition: 'background-color 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: isDark ? '#2c2c2c' : '#ffffff',
    borderRadius: '24px',
    padding: '24px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)',
    border: isDark ? '1px solid #3a3a3a' : 'none',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '80vh',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#1e293b',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: isDark ? '#94a3b8' : '#64748b',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  modalListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    color: isDark ? '#94a3b8' : '#64748b',
    fontSize: '0.85rem',
    backgroundColor: isDark ? '#2c2c2c' : '#ffffff',
    borderRadius: '24px',
    border: isDark ? '1px solid #3a3a3a' : 'none',
  },
  error: {
    padding: '14px 16px',
    backgroundColor: isDark ? '#3b1c1c' : '#fee2e2',
    border: isDark ? '1px solid #7f1d1d' : '1px solid #fecaca',
    borderRadius: '16px',
    color: isDark ? '#fca5a5' : '#991b1b',
    fontSize: '0.85rem',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  pillRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
    borderRadius: '9999px',
    boxShadow: isDark ? '0 3px 12px rgba(0, 0, 0, 0.3)' : '0 3px 12px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
    border: isDark ? '1px solid #3a3a3a' : '1px solid #f1f5f9',
    width: '100%',
    boxSizing: 'border-box',
  },
  leftInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: isDark ? '#334155' : '#b4b4b4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isDark ? '#f8fafc' : '#1a1a1a',
    fontWeight: '700',
    fontSize: '1rem',
    flexShrink: 0,
  },
  textColumn: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  displayName: {
    fontWeight: '700',
    fontSize: '0.85rem',
    color: isDark ? '#f8fafc' : '#000000',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.2',
  },
  displayEmail: {
    fontSize: '0.75rem',
    color: isDark ? '#94a3b8' : '#666666',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '1px',
  },
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
    marginLeft: '6px',
  },
  acceptButton: {
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#ffffff',
    border: isDark ? '1.5px solid #22c55e' : '1.5px solid #00e626',
    color: isDark ? '#4ade80' : '#00e626',
    borderRadius: '9999px',
    padding: '5px 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  declineButton: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#ffffff',
    border: isDark ? '1.5px solid #ef4444' : '1.5px solid #ff0000',
    color: isDark ? '#f87171' : '#ff0000',
    borderRadius: '9999px',
    padding: '5px 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
  },
  emptyIcon: {
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#334155',
    margin: '0 0 4px 0',
  },
  emptyHint: {
    fontSize: '0.78rem',
    color: isDark ? '#94a3b8' : '#64748b',
    margin: 0,
  },
  popupOverlay: {
    position: 'fixed',
    bottom: '28px',
    right: '28px',
    zIndex: 300,
    pointerEvents: 'none',
  },
  popupCard: {
    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
    borderRadius: '18px',
    padding: '16px 20px',
    maxWidth: '320px',
    width: 'max-content',
    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06)',
    border: isDark ? '1px solid #3a3a3a' : 'none',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '14px',
    pointerEvents: 'auto',
  },
  popupIconRing: {
    flexShrink: 0,
  },
  popupTitle: {
    margin: '0 0 3px',
    fontSize: '0.92rem',
    fontWeight: '800',
    color: isDark ? '#f8fafc' : '#0f172a',
  },
  popupSub: {
    margin: 0,
    fontSize: '0.8rem',
    color: isDark ? '#cbd5e1' : '#475569',
    lineHeight: 1.4,
  },
});