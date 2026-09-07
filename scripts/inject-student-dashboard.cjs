const fs = require('fs');
let file = 'c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const hooks = `  const navRef_settings = useRef(null);
  const enrolledRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });
  const [enrolledIndicator, setEnrolledIndicator] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
        let activeRef = null;
        if (typeof activeView !== 'undefined') {
            activeRef = activeView === 'calendar' ? navRef_calendar : (activeView === 'archived' ? navRef_archived : (activeView === 'settings' ? navRef_settings : navRef_classrooms));
        } else {
            activeRef = navRef_classrooms;
        }
        if (activeRef && activeRef.current) {
            const el = activeRef.current;
            setIndicatorStyle(prev => {
                if (prev.top === el.offsetTop && prev.height === el.offsetHeight && prev.opacity === 1) return prev;
                sessionStorage.setItem('verity_nav_top', el.offsetTop); return { top: el.offsetTop, height: el.offsetHeight, opacity: 1 };
            });
        }
        
        let activeBotRef = null;
        // The dashboard doesn't have an "active" classroom state stored in a variable, but let's just clear it or handle it if we want it to highlight.
        // Usually clicking a class navigates away, so we don't strictly need it to stay active, but we should render the indicator div.
        setEnrolledIndicator(prev => {
            if (prev.opacity === 0) return prev;
            return { ...prev, opacity: 0 };
        });

    }, 10);
    return () => clearTimeout(timer);
  });`;

content = content.replace(`  const navRef_settings = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
        let activeRef = null;
        if (typeof activeView !== 'undefined') {
            activeRef = activeView === 'calendar' ? navRef_calendar : (activeView === 'archived' ? navRef_archived : (activeView === 'settings' ? navRef_settings : navRef_classrooms));
        } else {
            activeRef = navRef_classrooms;
        }
        if (activeRef && activeRef.current) {
            const el = activeRef.current;
            setIndicatorStyle(prev => {
                if (prev.top === el.offsetTop && prev.height === el.offsetHeight && prev.opacity === 1) return prev;
                sessionStorage.setItem('verity_nav_top', el.offsetTop); return { top: el.offsetTop, height: el.offsetHeight, opacity: 1 };
            });
        }
    }, 10);
    return () => clearTimeout(timer);
  });`, hooks);


const htmlInjection = `<div className="nav-indicator" style={{
            position: 'absolute',
            left: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            transition: 'top 0.6s cubic-bezier(0.5, 2.5, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
            pointerEvents: 'none',
            zIndex: 0,
            boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.35)',
          }} />
          
          <div className="nav-indicator" style={{
            position: 'absolute',
            left: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            transition: 'top 0.6s cubic-bezier(0.5, 2.5, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
            top: enrolledIndicator.top,
            height: enrolledIndicator.height,
            opacity: enrolledIndicator.opacity,
            pointerEvents: 'none',
            zIndex: 0,
            boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.35)',
          }} />`;
          
content = content.replace(`<div className="nav-indicator" style={{
            position: 'absolute',
            left: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            transition: 'top 0.6s cubic-bezier(0.5, 2.5, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
            pointerEvents: 'none',
            zIndex: 0,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.3)'
          }} />`, htmlInjection);

content = content.replace(`                <div 
                  key={cls.id} 
                  style={{...styles.navItem, justifyContent: collapsed ? 'center' : 'flex-start'}} 
                  onClick={() => onEnterClassroom(cls)}
                  title={cls.name}
                >`, `                <div 
                  key={cls.id} ref={el => enrolledRefs.current['cls_' + cls.id] = el}
                  style={{...styles.navItem, justifyContent: collapsed ? 'center' : 'flex-start'}} 
                  onClick={() => onEnterClassroom(cls)}
                  title={cls.name}
                >`);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed StudentDashboard.jsx liquid indicator');
