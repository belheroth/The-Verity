import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Common showcase styles matching Apple / Material Design minimalism
const st = {
  wrapper: {
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    fontFamily: 'Arial, Helvetica, sans-serif',
    marginBottom: '24px'
  },
  header: {
    margin: '0 0 20px 0',
    color: '#1e293b',
    fontSize: '1.25rem',
    fontWeight: '800'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px'
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '360px',
    border: '1px solid #e2e8f0',
    position: 'relative'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#334155',
    marginBottom: '6px'
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '20px',
    lineHeight: 1.4
  }
};

// 1. Button Hover
const ButtonHover = () => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  return (
    <div style={st.card}>
      <h3 style={st.cardTitle}>Button Hover</h3>
      <p style={st.cardDesc}>Subtle scale and color change on hover and press.</p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          padding: '12px 24px',
          backgroundColor: hover ? '#007bff' : '#f8fafc',
          color: hover ? 'white' : '#334155',
          border: 'none',
          borderRadius: '9999px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'backgroundColor 0.2s, color 0.2s'
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        Hover Me
      </motion.button>
    </div>
  );
};

// 2. Input Focus
const InputFocus = () => {
  const [focused, setFocused] = useState(false);

  return (
    <div style={st.card}>
      <h3 style={st.cardTitle}>Input Focus</h3>
      <p style={st.cardDesc}>Input expands and highlights on focus.</p>

      <motion.input
        placeholder="Type something..."
        style={{
          width: focused ? '100%' : '80%',
          padding: '12px',
          borderRadius: '9999px',
          border: focused ? '2px solid #007bff' : '1px solid #e2e8f0',
          backgroundColor: 'white',
          fontSize: '0.875rem',
          transition: 'width 0.3s, border-color 0.3s'
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
};

// 3. Toggle Switch
const ToggleSwitch = () => {
  const [checked, setChecked] = useState(false);

  return (
    <div style={st.card}>
      <h3 style={st.cardTitle}>Toggle Switch</h3>
      <p style={st.cardDesc}>Animated switch with background color change.</p>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '50px',
          height: '28px',
          backgroundColor: checked ? '#22c55e' : '#e2e8f0',
          borderRadius: '9999px',
          padding: '3px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          transition: 'backgroundColor 0.3s'
        }}
        onClick={() => setChecked(!checked)}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '22px',
            height: '22px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: 'backgroundColor 0.2s'
          }}
        />
      </motion.div>
    </div>
  );
};

export default function MicroInteractionsShowcase() {
  return (
    <div style={st.wrapper}>
      <h2 style={st.header}>Micro Interactions Showcase</h2>
      <div style={st.grid}>
        <ButtonHover />
        <InputFocus />
        <ToggleSwitch />
      </div>
    </div>
  );
}