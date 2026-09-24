import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

export default function PasswordRequirements({ password, policies }) {
  const { isDark } = useDarkMode();
  if (!policies || (!policies.minLength8 && !policies.numbers && !policies.specialChars)) return null;

  const reqs = [];
  if (policies.minLength8) reqs.push({ label: 'At least 8 characters', met: password.length >= 8 });
  if (policies.numbers) reqs.push({ label: 'Contains a number', met: /\d/.test(password) });
  if (policies.specialChars) reqs.push({ label: 'Contains a special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) });

  return (
    <div style={{
      marginTop: '8px',
      padding: '10px 14px',
      borderRadius: '8px',
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      fontSize: '0.8rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{ fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569', marginBottom: '2px' }}>Password Requirements:</div>
      {reqs.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: r.met ? '#22c55e' : (isDark ? '#94a3b8' : '#64748b') }}>
          {r.met ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={2.5} />}
          <span style={{ transition: 'color 0.2s', textDecoration: r.met ? 'line-through' : 'none' }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}
