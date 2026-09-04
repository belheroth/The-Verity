import React, { useState, useEffect } from 'react';
import { Home, Calendar, ClipboardList, Settings, MoreVertical, Plus, LogOut, User, X, Menu, Archive } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import ProfileMenu from './ProfileMenu';
import TeacherCalendar from './TeacherCalendar';

const STORAGE_KEY = 'verity_classrooms';

const DEFAULT_CLASSROOMS = [
  { id: 1, section: "CS101", name: "C# Programming", subject: "Computer Science" },
  { id: 2, section: "IT202", name: "Data Structures", subject: "Information Tech" }
];

export default function TeacherDashboard({ onLogout, onEnterClassroom }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('verity_sidebar_collapsed') === 'true');
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('verity_sidebar_collapsed', next);
  };

  // Load saved classrooms from localStorage so they survive a refresh.
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CLASSROOMS;
    } catch {
      return DEFAULT_CLASSROOMS;
    }
  });

  // Persist classrooms whenever they change — locally (survives refresh) and to
  // the backend (so the Admin dashboard can count them server-wide).
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classrooms));
    fetch('http://localhost:3001/classrooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classrooms })
    }).catch(() => { /* offline — localStorage copy still holds */ });
  }, [classrooms]);

  const [activeMenu, setActiveMenu] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState(() => localStorage.getItem('verity_teacher_view') || 'classrooms');
  const handleSetView = (view) => {
    setActiveView(view);
    localStorage.setItem('verity_teacher_view', view);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', section: '', subject: '' });

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleDeleteClass = (e, id) => {
    e.stopPropagation(); // don't trigger "enter classroom"
    setClassrooms(classrooms.filter(cls => cls.id !== id));
    setActiveMenu(null);
  };

  const handleCreateClass = (e) => {
    e.preventDefault();
    // Add the new class to the grid
    const newClassroom = {
      id: Date.now(),
      section: newClass.section || "N/A",
      name: newClass.name,
      subject: newClass.subject
    };
    
    setClassrooms([newClassroom, ...classrooms]);
    setIsModalOpen(false); // Close the modal
    setNewClass({ name: '', section: '', subject: '' }); // Reset form
  };

  // Settings is its own independent full-screen page, not an overlay.
  if (isSettingsOpen) {
    return <SettingsPanel role="Instructor" onBack={() => setIsSettingsOpen(false)} />;
  }

  return (
    <div style={styles.container}>

      {/* LEFT SIDEBAR */}
      <div style={{ ...styles.sidebar, width: collapsed ? '110px' : '250px', padding: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', whiteSpace: 'nowrap' }}>
          <Menu size={24} color="#10b981" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={toggleSidebar} />
          <div style={styles.logoContainer}>
          <span style={styles.logoV}>V</span>
          <span style={styles.logoText}>erity</span>
          <span style={styles.badge}>Instructor</span>
        </div>
        </div>

        <div style={styles.navGroup}>
          <div style={{...styles.navItem, ...(activeView === 'classrooms' ? styles.activeNavItem : {})}} onClick={() => handleSetView('classrooms')}>
            <Home size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Classrooms</span>}
          </div>
          <div style={{...styles.navItem, ...(activeView === 'calendar' ? styles.activeNavItem : {})}} onClick={() => handleSetView('calendar')}>
            <Calendar size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Calendar</span>}
          </div>
          <div style={{...styles.navItem}}>
            <Archive size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Archived Classrooms</span>}
          </div>
        </div>

        {classrooms.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {!collapsed && (
              <div style={{ 
                padding: '0 20px', 
                fontSize: '0.75rem', 
                fontWeight: 'bold', 
                color: '#9ca3af', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: '5px'
              }}>
                Teaching
              </div>
            )}
            {classrooms.map((cls) => {
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              const color = colors[cls.id % colors.length];
              
              return (
                <div 
                  key={cls.id} 
                  style={{...styles.navItem}}
                  onClick={() => onEnterClassroom(cls)}
                  title={cls.name}
                >
                  <div style={{
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '6px', 
                    backgroundColor: color, 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {cls.name.charAt(0).toUpperCase()}
                  </div>
                  {!collapsed && <span style={{ marginLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.name}</span>}
                </div>
              );
            })}
          </div>
        )}
        
        <div style={{ flex: 1 }}></div>

        <div style={{...styles.navItem}}  onClick={() => setIsSettingsOpen(true)} title="Settings">
          <Settings size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Settings</span>}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={styles.mainContent}>
        
        {/* Top Bar */}
        <div style={styles.topBar}>
          <ProfileMenu onLogout={onLogout} />
        </div>

        {/* The Main White Card */}
        <div style={styles.whiteCard}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 10px' }}>
            <button onClick={() => setIsModalOpen(true)} style={styles.createButton}>
              Create
            </button>
          </div>

          {/* Classroom Grid */}
          <div style={styles.grid}>
            {classrooms.map(cls => (
              <div key={cls.id} style={styles.cardContainer} className="card-hover animate-fade-in-up" onClick={() => onEnterClassroom(cls)}>
                <div style={styles.cardPill}>{cls.section}</div>

                <div style={styles.cardBody}>
                  <h3 style={{ color: '#4b5563', margin: '0 0 10px 0' }}>{cls.name}</h3>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>{cls.subject}</p>
                  
                  <div style={styles.dots} onClick={(e) => toggleMenu(e, cls.id)}>
                    <MoreVertical size={18} />
                  </div>

                  {activeMenu === cls.id && (
                    <div style={styles.dropdownMenu}>
                      <div style={styles.dropdownItem}>Archive</div>
                      <div style={styles.dropdownItem}>Hide</div>
                      <div style={{...styles.dropdownItem, color: '#ef4444'}} onClick={(e) => handleDeleteClass(e, cls.id)}>Delete</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* CREATE CLASSROOM MODAL (Overlay) */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Create Class</h2>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeModalBtn}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateClass} style={styles.form}>
              <input 
                type="text" 
                placeholder="Class name (Required)" 
                required 
                value={newClass.name}
                onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                style={styles.input}
              />
              <input 
                type="text" 
                placeholder="Section" 
                value={newClass.section}
                onChange={(e) => setNewClass({...newClass, section: e.target.value})}
                style={styles.input}
              />
              <input 
                type="text" 
                placeholder="Subject" 
                value={newClass.subject}
                onChange={(e) => setNewClass({...newClass, subject: e.target.value})}
                style={styles.input}
              />
              
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <button type="submit" style={styles.submitModalBtn}>Create</button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// STYLES
const styles = {
  container: { height: '100%', width: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif', position: 'relative' },
  sidebar: { width: '250px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '40px', zIndex: 10, transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' },
  logoContainer: { display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  badge: { fontSize: '0.7rem', backgroundColor: '#4b5563', color: 'white', padding: '3px 8px', borderRadius: '10px', marginLeft: '10px', fontStyle: 'normal', transform: 'translateY(-5px)' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
  navItem: { display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'color 0.15s', borderRadius: '10px', background: 'transparent', boxShadow: 'none' , whiteSpace: 'nowrap' },
  activeNavItem: { color: '#10b981', fontWeight: '700', backgroundColor: 'transparent', boxShadow: 'none' },
  settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column', zIndex: 1 },
  topBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  logoutButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  profileCircle: { width: '50px', height: '50px', backgroundColor: '#d1d5db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' },
  whiteCard: { backgroundColor: 'white', flex: 1, borderRadius: '24px', padding: 'clamp(20px, 4vw, 40px)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflowY: 'auto' },
  
  // The Green Create Button
  createButton: { display: 'flex', alignItems: 'center', padding: '10px 30px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: '30px' },
  cardContainer: { display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' },
  cardPill: { backgroundColor: '#d1d5db', height: '30px', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.85rem', fontWeight: 'bold' },
  cardBody: { backgroundColor: '#d1d5db', height: '180px', borderRadius: '20px', padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', transition: 'transform 0.2s' },
  dots: { position: 'absolute', bottom: '15px', right: '15px', width: '30px', height: '30px', backgroundColor: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', cursor: 'pointer' },
  dropdownMenu: { position: 'absolute', bottom: '50px', right: '10px', backgroundColor: '#9ca3af', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10 },
  dropdownItem: { padding: '5px 15px', color: 'black', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },

  // Modal Styles
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalCard: { backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  closeModalBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', color: '#4b5563', fontSize: '1rem', boxSizing: 'border-box', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' },
  submitModalBtn: { padding: '10px 40px', backgroundColor: '#d1d5db', border: 'none', borderRadius: '50px', color: '#4b5563', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }
};