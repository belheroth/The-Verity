import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, Home, Shield, Settings, Search, Bell, Plus, X, Trash2, User, Menu, X as XIcon, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import ProfileMenu from '../ProfileMenu';
import { useDarkMode } from '../../hooks/useDarkMode';

// Shared styles (moved from original file for layout concerns)
const getLayoutStyles = (isDark) => ({
  header: {
    height: '72px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    backgroundColor: isDark ? '#3C3C3C' : '#EEF0F3',
    borderBottom: 'none',
    zIndex: 50,
    transition: 'background-color 0.25s ease'
  },
  sidebar: (collapsed) => ({
    width: collapsed ? '84px' : '240px',
    minWidth: collapsed ? '84px' : '240px',
    padding: '20px 14px 20px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
    background: 'transparent',
    overflowY: 'auto',
    overflowX: 'hidden'
  }),
  sidebarBtn: (collapsed) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '16px',
    padding: '10px 18px',
    width: '100%',
    height: '42px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    position: 'relative',
    zIndex: 1
  }),
  badge: {
    fontSize: '0.7rem',
    backgroundColor: isDark ? '#2c2f38' : '#EEF0F3',
    color: isDark ? '#f5f5f5' : '#475569',
    padding: '3px 8px',
    borderRadius: '10px',
    marginLeft: '6px',
    fontStyle: 'normal',
    transform: 'translateY(-5px)',
    border: isDark ? '1px solid #3d424f' : '1px solid #cbd5e1'
  },
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
});

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
  const { isDark } = useDarkMode();
  const layoutStyles = getLayoutStyles(isDark);
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

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 120);
  };

  const isExpanded = !currentSidebarCollapsed || isHovered;
  const effectiveSidebarCollapsed = !isExpanded;

  const navRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState(() => {
    try {
      const savedTop = sessionStorage.getItem('verity_admin_nav_indicator_top');
      const savedHeight = sessionStorage.getItem('verity_admin_nav_indicator_height');
      if (savedTop !== null && !isNaN(Number(savedTop))) {
        return {
          top: Number(savedTop),
          height: savedHeight ? Number(savedHeight) : 42,
          opacity: 1,
          transition: true
        };
      }
    } catch { /* ignore */ }
    return { top: 0, height: 42, opacity: 0, transition: false };
  });

  useLayoutEffect(() => {
    const update = () => {
      const activeRef = navRefs.current[currentActiveTab];
      if (activeRef) {
        try {
          sessionStorage.setItem('verity_admin_nav_indicator_top', String(activeRef.offsetTop));
          sessionStorage.setItem('verity_admin_nav_indicator_height', String(activeRef.offsetHeight));
        } catch { /* ignore */ }

        setIndicatorStyle(prev => {
          const distance = Math.abs(activeRef.offsetTop - prev.top);
          const bounceOvershoot = distance > 0 ? Math.min(0.42, Math.max(0.03, 16 / distance)) : 0;
          const bounceRatio = (1 + bounceOvershoot).toFixed(3);
          const duration = distance > 150 ? '0.46s' : '0.38s';
          const transitionStr = `top ${duration} cubic-bezier(0.34, ${bounceRatio}, 0.64, 1), height 0.25s ease, opacity 0.2s ease`;

          if (prev.top === activeRef.offsetTop && prev.height === activeRef.offsetHeight && prev.opacity === 1 && prev.transition === transitionStr) return prev;
          return { top: activeRef.offsetTop, height: activeRef.offsetHeight, opacity: 1, transition: transitionStr };
        });
      } else {
        setIndicatorStyle(prev => prev.opacity === 0 ? prev : { ...prev, opacity: 0 });
      }
    };

    update();
    const timer = setTimeout(update, 20);
    return () => clearTimeout(timer);
  }, [currentActiveTab, effectiveSidebarCollapsed]);

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      minHeight: '100vh',
      backgroundColor: isDark ? '#3C3C3C' : '#EEF0F3',
      fontFamily: 'Arial, Helvetica, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background-color 0.25s ease'
    }}>
      {/* ═══ GLOBAL TOP HEADER (Matched with Instructor/Student) ═══ */}
      <header style={layoutStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => finalSetSidebarCollapsed(!currentSidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#d4d4d4' : '#64748b',
              flexShrink: 0,
              marginRight: '16px'
            }}
            title={!currentSidebarCollapsed ? "Unpin sidebar" : "Pin sidebar"}
            className="icon-btn-anim"
          >
            <Menu size={24} color={isDark ? '#d4d4d4' : '#64748b'} />
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              fontSize: '2.5rem',
              fontWeight: '900',
              fontStyle: 'italic',
              cursor: 'pointer'
            }}
            onClick={() => finalSetActiveTab('dashboard')}
          >
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: isDark ? '#f5f5f5' : '#1e293b' }}>erity</span>
            <span style={layoutStyles.badge}>Admin</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => finalSetShowNotifications(!currentShowNotifications)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#e2e8f0',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.06)'
              }}
              title="Notifications"
            >
              <Bell size={18} color="#475569" />
              {currentNotifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  border: '1.5px solid white'
                }} />
              )}
            </button>
            {currentShowNotifications && (
              <div style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '320px',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                zIndex: 200,
                padding: '16px',
                border: '1px solid #e2e8f0'
              }} className="animate-scale-in">
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

          <ProfileMenu onLogout={onLogout} />
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
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={layoutStyles.sidebar(effectiveSidebarCollapsed)}
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
              background: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '14px',
              boxShadow: isDark
                ? '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.35)',
              transition: indicatorStyle.transition || 'none',
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
                  style={layoutStyles.sidebarBtn(effectiveSidebarCollapsed)}
                  title={effectiveSidebarCollapsed ? label : ''}
                >
                  <Icon size={20} color={active ? '#10b981' : (isDark ? '#a3a3a3' : '#475569')} style={{ flexShrink: 0 }} />
                  {!effectiveSidebarCollapsed && (
                    <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '600', color: active ? '#10b981' : (isDark ? '#e5e5e5' : '#334155'), overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
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