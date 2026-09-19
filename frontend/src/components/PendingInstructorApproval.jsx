import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';

// API configuration
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PendingInstructorApproval({ users, onUpdateUser, onActionLogged }) {
  // Filter users with role "Instructor" and status "Pending"
  const [pendingInstructors, setPendingInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successPopup, setSuccessPopup] = useState(null); // { name: string }

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
      setSuccessPopup({ name });
      setTimeout(() => setSuccessPopup(null), 2500);

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
      const response = await apiFetch(`${API}/users/${encodeURIComponent(email)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected' })
      });

      if (!response.ok) {
        throw new Error(`Failed to reject user: ${response.status}`);
      }

      // Log the action
      if (onActionLogged) {
        onActionLogged({
          type: 'REJECT_INSTRUCTOR',
          email,
          timestamp: new Date().toISOString(),
          message: `Instructor rejected`
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

  return (
    <div style={styles.cardContainer}>
      <h2 style={styles.title}>Pending Instructor Approval</h2>

      {pendingInstructors.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H16L20 16V6C20 4.89543 19.1046 4 20 4Z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 6H20" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 10H20" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 14H20" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
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
          {pendingInstructors.map(instructor => {
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
          })}
        </div>
      )}

      {/* SVG Success Popup */}
      <AnimatePresence>
        {successPopup && (
          <motion.div
            key="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.popupOverlay}
          >
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              style={styles.popupCard}
            >
              <div style={styles.popupIconRing}>
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#dcfce7" />
                  <path
                    d="M11 20.5L17 27L29 14"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p style={styles.popupTitle}>Instructor Approved</p>
                <p style={styles.popupSub}><strong>{successPopup.name}</strong> has been granted access as an instructor.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Styles matching exact UI screenshot specifications
const styles = {
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
    padding: '18px 20px',
    width: '100%',
    boxSizing: 'border-box',
  },
  title: {
    margin: '0 0 14px 0',
    fontSize: '0.88rem',
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    color: '#64748b',
    fontSize: '0.85rem',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
  },
  error: {
    padding: '14px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '16px',
    color: '#991b1b',
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
    backgroundColor: '#ffffff',
    borderRadius: '9999px',
    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
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
    backgroundColor: '#b4b4b4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1a1a1a',
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
    color: '#000000',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.2',
  },
  displayEmail: {
    fontSize: '0.75rem',
    color: '#666666',
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
    backgroundColor: '#ffffff',
    border: '1.5px solid #00e626',
    color: '#00e626',
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
    backgroundColor: '#ffffff',
    border: '1.5px solid #ff0000',
    color: '#ff0000',
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
    color: '#334155',
    margin: '0 0 4px 0',
  },
  emptyHint: {
    fontSize: '0.78rem',
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '16px 20px',
    maxWidth: '320px',
    width: 'max-content',
    boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06)',
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
    color: '#0f172a',
  },
  popupSub: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#475569',
    lineHeight: 1.4,
  },
};