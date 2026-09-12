import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Filter, BarChart2, Bell } from 'lucide-react';

// Common showcase styles matching Apple / Material Design minimalism
const st = {
  wrapper: {
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
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
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  }
};

// 1. Context Transition
const ContextTransition = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={16} /> },
    { id: 'filters', label: 'Filters', icon: <Filter size={16} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={16} /> }
  ];

  const contentMap = {
    overview: (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ height: '24px', width: '60%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
        <div style={{ height: '14px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
        <div style={{ height: '14px', width: '80%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
      </div>
    ),
    filters: (
      <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {['Active', 'Pending', 'Archived', 'New', 'Critical'].map(tag => (
          <div key={tag} style={{ padding: '6px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600' }}>
            {tag}
          </div>
        ))}
      </div>
    ),
    alerts: (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ height: '14px', width: '70%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <div style={{ height: '14px', width: '50%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
        </div>
      </div>
    )
  };

  return (
    <div style={st.card}>
      <h3 style={st.cardTitle}>Context Transition</h3>
      <p style={st.cardDesc}>Fixed outer structure, animated inner content based on state.</p>

      <div style={st.innerContainer}>
        {/* Nav Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                color: activeTab === tab.id ? '#0f172a' : '#64748b',
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'color 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ position: 'relative', flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ position: 'absolute', inset: 0 }}
            >
              {contentMap[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// 2. Drill Transition
const DrillTransition = () => {
  const [selectedItem, setSelectedItem] = useState(null);

  const items = [
    { id: 1, name: 'Alice Smith', desc: 'Hey, are we still on for...' },
    { id: 2, name: 'Bob Jones', desc: 'Attached the latest invoice.' },
    { id: 3, name: 'Charlie Davis', desc: 'Thanks! Let me review this.' }
  ];

  return (
    <div style={st.card}>
      <h3 style={st.cardTitle}>Drill Transition</h3>
      <p style={st.cardDesc}>Hierarchy navigation sliding in from the right.</p>

      <div style={st.innerContainer}>
        <AnimatePresence initial={false}>
          {!selectedItem ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
                Messages
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{ padding: '16px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#334155' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={16} color="#cbd5e1" />
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'white', zIndex: 10, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#007bff', fontWeight: '600', fontSize: '0.85rem' }}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', marginLeft: 'auto' }}>
                  {selectedItem.name}
                </div>
              </div>
              <div style={{ padding: '20px', flex: 1 }}>
                <div style={{ height: '14px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '14px', width: '90%', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '14px', width: '60%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 3. Continuity Transition
const ContinuityTransition = () => {
  const [selectedId, setSelectedId] = useState(null);

  const cards = [1, 2, 3, 4, 5, 6];

  return (
    <div style={st.card}>
      <h3 style={st.cardTitle}>Continuity Transition</h3>
      <p style={st.cardDesc}>Shared layout animations preserving context (click a card).</p>

      <div style={{ ...st.innerContainer, border: 'none', boxShadow: 'none', padding: '0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {cards.map(id => (
          <motion.div
            key={id}
            layoutId={`card-${id}`}
            onClick={() => setSelectedId(id)}
            style={{
              backgroundColor: '#e2e8f0',
              borderRadius: '8px',
              height: '80px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              color: '#94a3b8'
            }}
          >
            {id}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            layoutId={`card-${selectedId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: 'absolute',
              inset: '24px', // padding of the card
              backgroundColor: 'white',
              borderRadius: '16px',
              zIndex: 20,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: '700', color: '#1e293b' }}>Item Details {selectedId}</div>
              <button
                onClick={() => setSelectedId(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: '#cbd5e1' }}>{selectedId}</div>
              <div style={{ width: '80%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '24px' }} />
              <div style={{ width: '60%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '12px' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function UITransitionsShowcase() {
  return (
    <div style={st.wrapper}>
      <h2 style={st.header}>UI Transitions Showcase</h2>
      <div style={st.grid}>
        <ContextTransition />
        <DrillTransition />
        <ContinuityTransition />
      </div>
    </div>
  );
}
