import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Filter, BarChart2, Bell } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

// 1. Context Transition
const ContextTransition = ({ isDark }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={16} /> },
    { id: 'filters', label: 'Filters', icon: <Filter size={16} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={16} /> }
  ];

  const contentMap = {
    overview: (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ height: '24px', width: '60%', backgroundColor: isDark ? '#404040' : '#e2e8f0', borderRadius: '4px' }} />
        <div style={{ height: '14px', width: '100%', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px' }} />
        <div style={{ height: '14px', width: '80%', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px' }} />
      </div>
    ),
    filters: (
      <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {['Active', 'Pending', 'Archived', 'New', 'Critical'].map(tag => (
          <div key={tag} style={{ padding: '6px 12px', backgroundColor: isDark ? '#1e3a4a' : '#e0f2fe', color: isDark ? '#7dd3fc' : '#0369a1', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600' }}>
            {tag}
          </div>
        ))}
      </div>
    ),
    alerts: (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ height: '14px', width: '70%', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <div style={{ height: '14px', width: '50%', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px' }} />
        </div>
      </div>
    )
  };

  return (
    <div style={{
      backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
      borderRadius: '16px', padding: '24px',
      display: 'flex', flexDirection: 'column', minHeight: '360px',
      border: isDark ? '1px solid #3a3a3a' : '1px solid #e2e8f0', position: 'relative'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: isDark ? '#E8EAED' : '#334155', marginBottom: '6px' }}>Context Transition</h3>
      <p style={{ fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#64748b', marginBottom: '20px', lineHeight: 1.4 }}>Fixed outer structure, animated inner content based on state.</p>

      <div style={{
        flex: 1, backgroundColor: isDark ? '#1e1e1e' : 'white',
        borderRadius: '12px',
        boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.03)',
        border: isDark ? '1px solid #333333' : '1px solid #f1f5f9',
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Nav Bar */}
        <div style={{ display: 'flex', borderBottom: isDark ? '1px solid #333333' : '1px solid #f1f5f9', backgroundColor: isDark ? '#252525' : '#f8fafc' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '12px 0',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                color: activeTab === tab.id ? (isDark ? '#E8EAED' : '#0f172a') : (isDark ? '#6b7280' : '#64748b'),
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '0.8rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
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
const DrillTransition = ({ isDark }) => {
  const [selectedItem, setSelectedItem] = useState(null);

  const items = [
    { id: 1, name: 'Alice Smith', desc: 'Hey, are we still on for...' },
    { id: 2, name: 'Bob Jones', desc: 'Attached the latest invoice.' },
    { id: 3, name: 'Charlie Davis', desc: 'Thanks! Let me review this.' }
  ];

  return (
    <div style={{
      backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
      borderRadius: '16px', padding: '24px',
      display: 'flex', flexDirection: 'column', minHeight: '360px',
      border: isDark ? '1px solid #3a3a3a' : '1px solid #e2e8f0', position: 'relative'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: isDark ? '#E8EAED' : '#334155', marginBottom: '6px' }}>Drill Transition</h3>
      <p style={{ fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#64748b', marginBottom: '20px', lineHeight: 1.4 }}>Hierarchy navigation sliding in from the right.</p>

      <div style={{
        flex: 1, backgroundColor: isDark ? '#1e1e1e' : 'white',
        borderRadius: '12px',
        boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.03)',
        border: isDark ? '1px solid #333333' : '1px solid #f1f5f9',
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
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
              <div style={{ padding: '16px', borderBottom: isDark ? '1px solid #333333' : '1px solid #f1f5f9', fontWeight: '700', fontSize: '0.9rem', color: isDark ? '#E8EAED' : '#1e293b' }}>
                Messages
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{ padding: '16px', borderBottom: isDark ? '1px solid #2a2a2a' : '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: isDark ? '#d4d4d4' : '#334155' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: isDark ? '#6b7280' : '#94a3b8', marginTop: '4px' }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={16} color={isDark ? '#555555' : '#cbd5e1'} />
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
              style={{ position: 'absolute', inset: 0, backgroundColor: isDark ? '#1e1e1e' : 'white', zIndex: 10, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '16px', borderBottom: isDark ? '1px solid #333333' : '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#10b981', fontWeight: '600', fontSize: '0.85rem' }}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isDark ? '#E8EAED' : '#1e293b', marginLeft: 'auto' }}>
                  {selectedItem.name}
                </div>
              </div>
              <div style={{ padding: '20px', flex: 1 }}>
                <div style={{ height: '14px', width: '100%', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '14px', width: '90%', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '14px', width: '60%', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 3. Continuity Transition
const ContinuityTransition = ({ isDark }) => {
  const [selectedId, setSelectedId] = useState(null);
  const cards = [1, 2, 3, 4, 5, 6];

  return (
    <div style={{
      backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
      borderRadius: '16px', padding: '24px',
      display: 'flex', flexDirection: 'column', minHeight: '360px',
      border: isDark ? '1px solid #3a3a3a' : '1px solid #e2e8f0', position: 'relative'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: isDark ? '#E8EAED' : '#334155', marginBottom: '6px' }}>Continuity Transition</h3>
      <p style={{ fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#64748b', marginBottom: '20px', lineHeight: 1.4 }}>Shared layout animations preserving context (click a card).</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', flex: 1 }}>
        {cards.map(id => (
          <motion.div
            key={id}
            layoutId={`card-${id}`}
            onClick={() => setSelectedId(id)}
            style={{
              backgroundColor: isDark ? '#353535' : '#e2e8f0',
              borderRadius: '8px', height: '80px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700', color: isDark ? '#6b7280' : '#94a3b8'
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
              position: 'absolute', inset: '24px',
              backgroundColor: isDark ? '#1e1e1e' : 'white',
              borderRadius: '16px', zIndex: 20,
              boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDark ? '1px solid #333333' : '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: '700', color: isDark ? '#E8EAED' : '#1e293b' }}>Item Details {selectedId}</div>
              <button
                onClick={() => setSelectedId(null)}
                style={{ background: isDark ? '#333333' : '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isDark ? '#a3a3a3' : '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: isDark ? '#3a3a3a' : '#cbd5e1' }}>{selectedId}</div>
              <div style={{ width: '80%', height: '12px', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px', marginTop: '24px' }} />
              <div style={{ width: '60%', height: '12px', backgroundColor: isDark ? '#333333' : '#f1f5f9', borderRadius: '4px', marginTop: '12px' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function UITransitionsShowcase() {
  const { isDark } = useDarkMode();
  return (
    <div style={{
      padding: '24px',
      backgroundColor: isDark ? '#282828' : 'white',
      borderRadius: '24px',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)',
      border: isDark ? '1px solid #3a3a3a' : 'none',
      fontFamily: 'Arial, Helvetica, sans-serif',
      marginBottom: '24px',
      transition: 'background-color 0.25s ease'
    }}>
      <h2 style={{ margin: '0 0 20px 0', color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.25rem', fontWeight: '800' }}>
        UI Transitions Showcase
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <ContextTransition isDark={isDark} />
        <DrillTransition isDark={isDark} />
        <ContinuityTransition isDark={isDark} />
      </div>
    </div>
  );
}
