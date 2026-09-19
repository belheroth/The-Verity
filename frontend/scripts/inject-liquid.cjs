const fs = require('fs');
let file = 'c:/Users/vicfa/The-Verity/src/pages/ClassroomView.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Inject Hooks
content = content.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';"
);

const hooks = `  const navRef_classrooms = useRef(null);
  const navRef_calendar = useRef(null);
  const navRef_archived = useRef(null);
  const enrolledRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });
  const [enrolledIndicator, setEnrolledIndicator] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
        setIndicatorStyle(prev => {
            if (prev.opacity === 0) return prev;
            return { ...prev, opacity: 0 };
        });
        
        let activeBotRef = null;
        if (typeof classroom !== 'undefined' && classroom) {
            activeBotRef = enrolledRefs.current['cls_' + classroom.id];
        }
        
        if (activeBotRef) {
            const el = activeBotRef;
            setEnrolledIndicator(prev => {
                if (prev.top === el.offsetTop && prev.height === el.offsetHeight && prev.opacity === 1) return prev;
                sessionStorage.setItem('verity_nav_top', el.offsetTop); return { top: el.offsetTop, height: el.offsetHeight, opacity: 1 };
            });
        } else {
            setEnrolledIndicator(prev => {
                if (prev.opacity === 0) return prev;
                return { ...prev, opacity: 0 };
            });
        }
    }, 10);
    return () => clearTimeout(timer);
  });

  const [expandedId`;

content = content.replace("  const [expandedId", hooks);

// 2. Inject HTML
const liquidHTML = `        <div style={styles.logoContainer}>
          <span style={styles.logoV}>V</span>
          <span style={styles.logoText}>erity</span>
        </div>
        </div>

        {/* Liquid sliding indicator */}
        <div style={{
          position: 'absolute',
          left: '30px',
          right: '30px',
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.35)',
          transition: 'top 0.6s cubic-bezier(0.5, 2.5, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
          opacity: indicatorStyle.opacity,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        {/* Liquid sliding indicator for classrooms */}
        <div style={{
          position: 'absolute',
          left: '30px',
          right: '30px',
          top: enrolledIndicator.top,
          height: enrolledIndicator.height,
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.35)',
          transition: 'top 0.6s cubic-bezier(0.5, 2.5, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
          opacity: enrolledIndicator.opacity,
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={styles.navGroup}>`;

content = content.replace(`        <div style={styles.logoContainer}>
          <span style={styles.logoV}>V</span>
          <span style={styles.logoText}>erity</span>
        </div>
        </div>

        <div style={styles.navGroup}>`, liquidHTML);

// 3. Inject Refs into Nav Items
const navHTML = `          <div ref={navRef_classrooms} style={{...styles.navItem, position: 'relative', zIndex: 1, justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_student_view', 'classrooms'); onBack(); }}>
            <Home size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Classrooms</span>}
          </div>
          <div ref={navRef_calendar} style={{...styles.navItem, position: 'relative', zIndex: 1, justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_student_view', 'calendar'); onBack(); }}>
            <Calendar size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Calendar</span>}
          </div>
          <div ref={navRef_archived} style={{...styles.navItem, position: 'relative', zIndex: 1, justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_student_view', 'archived'); onBack(); }}>
            <Archive size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Archived Classrooms</span>}
          </div>`;

content = content.replace(`          <div style={{...styles.navItem, ...styles.activeNavItem}} onClick={() => { localStorage.setItem('verity_student_view', 'classrooms'); onBack(); }}>
            <Home size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Classrooms</span>}
          </div>
          <div style={{...styles.navItem}} onClick={() => { localStorage.setItem('verity_student_view', 'calendar'); onBack(); }}>
            <Calendar size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Calendar</span>}
          </div>
          <div style={{...styles.navItem}}>
            <Archive size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Archived Classrooms</span>}
          </div>`, navHTML);

// 4. Inject Ref into Classroom Items
content = content.replace(`              return (
                <div 
                  key={cls.id} 
                  style={{...styles.navItem, ...(classroom?.id === cls.id ? styles.activeNavItem : {})}}
                  onClick={() => {
                     if (onEnterClassroom) onEnterClassroom(cls);
                  }}
                  title={cls.name}
                >`, `              return (
                <div 
                  key={cls.id} ref={el => enrolledRefs.current['cls_' + cls.id] = el}
                  style={{...styles.navItem, ...(classroom?.id === cls.id ? styles.activeNavItem : {}), justifyContent: collapsed ? 'center' : 'flex-start'}} 
                  onClick={() => {
                     if (onEnterClassroom) onEnterClassroom(cls);
                  }}
                  title={cls.name}
                >`);

fs.writeFileSync(file, content, 'utf8');
console.log("SUCCESSFULLY Injected liquid indicator into ClassroomView.jsx");
