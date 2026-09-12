import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, Home, Shield, Settings, Search, Bell, Plus, X, Trash2, User, Menu, X as XIcon, Filter, CheckCircle, AlertCircle } from 'lucide-react';

// Shared styles (moved from original file for layout concerns)
const layoutStyles = {
  header: {
    height: '72px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    backgroundColor: '#e2e8f0',
    zIndex: 50
  },
  sidebar: (collapsed) => ({
    width: collapsed ? '88px' : '240px',
    minWidth: collapsed ? '88px' : '240px',
    padding: collapsed ? '20px 8px 20px' : '20px 14px 20px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    background: 'transparent',
    overflowY: 'auto'
  }),
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 24px 24px',
    minWidth: 0,
    overflow: 'hidden'
  },
  tabContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflowY: 'auto',
    MsOverflowStyle: 'none',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      display: 'none'
    }
  }
};

export default function AdminLayout({
  children,
  activeTab,
  setActiveTab,
  sidebarCollapsed,
  setSidebarCollapsed,
  query,
  setQuery,
  dashboardSearchFocused,
  setDashboardSearchFocused,
  notifications,
  setNotifications,
  showNotifications,
  setShowNotifications,
  isModalOpen,
  setIsModalOpen,
  newUser,
  setNewUser,
  handleAddUser,
  onLogout,
  showSelectUsersPopup,
  setShowSelectUsersPopup
}) {
  const [localActiveTab, setLocalActiveTab] = useState(activeTab || 'dashboard');
  const [localSidebarCollapsed, setLocalSidebarCollapsed] = useState(sidebarCollapsed || false);
  const [localQuery, setLocalQuery] = useState(query || '');
  const [localDashboardSearchFocused, setLocalDashboardSearchFocused] = useState(dashboardSearchFocused || false);
  const [localNotifications, setLocalNotifications] = useState(notifications || []);
  const [localShowNotifications, setLocalShowNotifications] = useState(showNotifications || false);
  const [localIsModalOpen, setLocalIsModalOpen] = useState(isModalOpen || false);
  const [localNewUser, setLocalNewUser] = useState(newUser || { firstName: '', lastName: '', email: '', password: '', role: 'Student' });
  const [localShowSelectUsersPopup, setLocalShowSelectUsersPopup] = useState(showSelectUsersPopup || false);

  const currentActiveTab = activeTab !== undefined ? activeTab : localActiveTab;
  const currentSidebarCollapsed = sidebarCollapsed !== undefined ? sidebarCollapsed : localSidebarCollapsed;
  const currentQuery = query !== undefined ? query : localQuery;
  const currentDashboardSearchFocused = dashboardSearchFocused !== undefined ? dashboardSearchFocused : localDashboardSearchFocused;
  const currentNotifications = notifications !== undefined ? notifications : localNotifications;
  const currentShowNotifications = showNotifications !== undefined ? showNotifications : localShowNotifications;
  const currentIsModalOpen = isModalOpen !== undefined ? isModalOpen : localIsModalOpen;
  const currentNewUser = newUser !== undefined ? newUser : localNewUser;
  const currentShowSelectUsersPopup = showSelectUsersPopup !== undefined ? showSelectUsersPopup : localShowSelectUsersPopup;

  const finalSetActiveTab = setActiveTab || setLocalActiveTab;
  const finalSetSidebarCollapsed = setSidebarCollapsed || setLocalSidebarCollapsed;
  const finalSetQuery = setQuery || setLocalQuery;
  const finalSetDashboardSearchFocused = setDashboardSearchFocused || setLocalDashboardSearchFocused;
  const finalSetNotifications = setNotifications || setLocalNotifications;
  const finalSetShowNotifications = setShowNotifications || setLocalShowNotifications;
  const finalSetIsModalOpen = setIsModalOpen || setLocalIsModalOpen;
  const finalSetNewUser = setNewUser || setLocalNewUser;
  const finalSetShowSelectUsersPopup = setShowSelectUsersPopup || setLocalShowSelectUsersPopup;

  const navRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 42, opacity: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeRef = navRefs.current[activeTab];
      if (activeRef) {
        setIndicatorStyle(prev => {
          if (prev.top === activeRef.offsetTop && prev.height === activeRef.offsetHeight && prev.opacity === 1) return prev;
          // Note: In a real implementation, we'd need to handle sessionStorage properly
          // For now, we'll skip sessionStorage to avoid SSR issues
          return { top: activeRef.offsetTop, height: activeRef.offsetHeight, opacity: 1 };
        });
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [activeTab, sidebarCollapsed]);

  const navItems = [
    { id: 'dashboard', Icon: BarChart3, label: 'Dashboard Overview' },
    { id: 'users', Icon: Users, label: 'User Management' },
    { id: 'classes', Icon: Home, label: 'Global Classes' },
    { id: 'security', Icon: Shield, label: 'Security & Audit Logs' },
    { id: 'settings', Icon: Settings, label: 'Settings' },
  ];

  const getHeaderTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'users': return 'User Management';
      case 'classes': return 'Global Classes';
      case 'security': return 'Security & Audit Logs';
      case 'settings': return 'Settings';
      default: return 'Admin Panel';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: '100vh', backgroundColor: '#e2e8f0', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* ═══ GLOBAL TOP NAV (Google Classroom Style) ═══ */}
      <header style={layoutStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => finalSetSidebarCollapsed(!currentSidebarCollapsed)}
            style={{ background: 'none', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0, marginRight: '16px' }}
            title={currentSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="icon-btn-anim"
          >
            <Menu size={24} color="#64748b" />
          </button>

          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', cursor: 'pointer', marginRight: '32px' }} onClick={() => finalSetActiveTab('dashboard')}>
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: '#1e293b' }}>erity</span>
            <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: '10px', marginLeft: '6px', fontStyle: 'normal', transform: 'translateY(-5px)' }}>Admin</span>
          </div>

          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
            {getHeaderTitle(currentActiveTab)}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {currentActiveTab === 'dashboard' && (
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '8px 18px', width: '260px' }}>
              <motion.input
                value={currentQuery}
                onChange={e => finalSetQuery(e.target.value)}
                placeholder="Search..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: currentDashboardSearchFocused ? '100%' : '80%',
                  borderColor: currentDashboardSearchFocused ? '2px solid #007bff' : '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  color: '#334155',
                  transition: 'width 0.3s, border-color 0.3s'
                }}
                onFocus={() => finalSetDashboardSearchFocused(true)}
                onBlur={() => finalSetDashboardSearchFocused(false)}
              />
              <Search size={16} color="#64748b" />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <button onClick={() => finalSetShowNotifications(!currentShowNotifications)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Notifications">
              <Bell size={18} color="#475569" />
              {currentNotifications.length > 0 && (
                <span style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '1px solid white' }} />
              )}
            </button>
            {currentShowNotifications && (
              <div style={{ position: 'absolute', top: '48px', right: 0, width: '320px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: '16px', border: '1px solid #e2e8f0' }} className="animate-scale-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>Notifications</h3>
                  {currentNotifications.length > 0 && (
                    <span onClick={() => {
                      finalSetNotifications([]);
                      finalSetShowNotifications(false);
                      try { localStorage.setItem('verity_notifications_cleared', 'true'); } catch (e) { }
                    }} style={{ fontSize: '0.75rem', color: '#007bff', cursor: 'pointer', fontWeight: '600' }}>Mark all as read</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentNotifications.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>No new notifications.</div>
                  ) : (
                    currentNotifications.map(n => (
                      <div key={n.id} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#334155' }}>
                        <strong style={{ color: '#1e293b' }}>{n.title}</strong><br /><span style={{ color: '#64748b' }}>{n.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Select Users Popup */}
      {showSelectUsersPopup && (
        <motion.div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '280px',
            zIndex: 1000
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <motion.div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0'
            }}
          >
            <h2 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: '1.25rem' }}>
              Action Required
            </h2>
            <div style={{ color: '#334155', fontSize: '1rem', marginBottom: '24px' }}>
              Please select at least one user to perform this action.
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => finalSetShowSelectUsersPopup(false)}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '9999px',
                padding: '10px 24px',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
              }}
            >
              OK
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* ═══ MAIN LAYOUT WITH SIDEBAR ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ═══ SIDEBAR NAVIGATION ═══ */}
        <aside
          style={layoutStyles.sidebar(currentSidebarCollapsed)}
        >
          {/* Navigation Items with Glass Highlight */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative' }}>
            {/* Liquid sliding indicator */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: indicatorStyle.top,
              height: indicatorStyle.height,
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.35)',
              transition: 'top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.3s ease, opacity 0.2s ease',
              opacity: indicatorStyle.opacity,
              pointerEvents: 'none',
              zIndex: 0,
            }} />

            {navItems.map(({ id, Icon, label }) => {
              const active = currentActiveTab === id;
              return (
                <button
                  key={id}
                  ref={el => navRefs.current[id] = el}
                  onClick={() => finalSetActiveTab(id)}
                  style={{
                    display: 'flex',
                    flexDirection: currentSidebarCollapsed ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: currentSidebarCollapsed ? 'center' : 'flex-start',
                    gap: currentSidebarCollapsed ? '4px' : '16px',
                    padding: currentSidebarCollapsed ? '8px 4px' : '10px 18px',
                    width: '100%',
                    height: currentSidebarCollapsed ? '56px' : '42px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1
                  }}
                  title={label}
                >
                  <Icon size={currentSidebarCollapsed ? 18 : 20} color={active ? '#10b981' : '#475569'} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: currentSidebarCollapsed ? '0.66rem' : '0.85rem',
                    fontWeight: active ? '700' : '600',
                    color: active ? '#10b981' : '#334155',
                    textAlign: currentSidebarCollapsed ? 'center' : 'left',
                    lineHeight: currentSidebarCollapsed ? '1.15' : 'normal',
                    whiteSpace: currentSidebarCollapsed ? 'normal' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    display: currentSidebarCollapsed ? '-webkit-box' : 'block',
                    WebkitLineClamp: currentSidebarCollapsed ? 2 : 'unset',
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Profile & Logout Pill */}
          <div style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            overflow: 'hidden',
            paddingTop: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: currentSidebarCollapsed ? 0 : '16px', justifyContent: currentSidebarCollapsed ? 'center' : 'flex-start', paddingLeft: currentSidebarCollapsed ? 0 : '18px', width: '100%' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} title="System Admin">
                <User size={20} color="#475569" />
              </div>
              {!currentSidebarCollapsed && <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap' }}>System Admin</span>}
            </div>
            <button
              onClick={onLogout}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '9999px',
                padding: currentSidebarCollapsed ? '6px 12px' : '8px 24px',
                fontWeight: '700',
                fontSize: currentSidebarCollapsed ? '0.72rem' : '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                whiteSpace: 'nowrap'
              }}
              title="Logout"
              className="btn-anim"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT AREA ═══ */}
        <div style={layoutStyles.mainContent}>
          {/* Tab Content */}
          <div style={layoutStyles.tabContent}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}