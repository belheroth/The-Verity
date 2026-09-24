import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Clock, X } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import Skeleton from '../components/Skeleton';
import { apiFetch } from '../utils/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isLegacyHardcoded = (item) =>
  (item?.id === 1 || item?.id === 2) &&
  (item?.title?.startsWith('Activity 1:') || item?.title?.startsWith('Activity 2:'));

const parseDueDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDueTime = (item) => {
  if (item.time) return item.time;
  if (item.dueDate && typeof item.dueDate === 'string' && item.dueDate.includes('T')) {
    const d = new Date(item.dueDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  }
  return '11:59 PM';
};

const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];

const getActivityColor = (item) => {
  const t = (item.type || '').toLowerCase();
  if (t.includes('quiz') || t.includes('test') || t.includes('exam')) return '#10b981';
  if (t.includes('project')) return '#8b5cf6';
  const cId = Number(item.classroom_id || item.classId) || 0;
  return PALETTE[Math.abs(cId) % PALETTE.length];
};

export default function StudentCalendar({ classrooms }) {
  const { isDark } = useDarkMode();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterClass, setFilterClass] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const getCachedActivities = () => {
    const all = [];
    const classList = Array.isArray(classrooms) ? classrooms : [];
    classList.forEach(c => {
      try {
        const raw = localStorage.getItem(`verity_classwork_${c.id}`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) all.push(...list.map(cw => ({ ...cw, classroom_id: c.id })));
        }
      } catch {}
    });

    try {
      const raw = localStorage.getItem('verity_cached_classwork');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) all.push(...list);
      }
    } catch {}

    const seen = new Set();
    return all.filter(item => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      const inClass = classList.some(c => String(c.id) === String(item.classroom_id || item.classId));
      return !item.archived && !isLegacyHardcoded(item) && !!item.dueDate && inClass;
    });
  };

  const [activities, setActivities] = useState(() => getCachedActivities());

  useEffect(() => {
    let cancelled = false;

    const fetchAllActivities = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL}/classwork`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && Array.isArray(data.classwork)) {
            const classList = Array.isArray(classrooms) ? classrooms : [];
            const valid = data.classwork.filter(
              item => !item.archived && !isLegacyHardcoded(item) && !!item.dueDate && classList.some(c => String(c.id) === String(item.classroom_id || item.classId))
            );
            setActivities(valid);
            try {
              localStorage.setItem('verity_cached_classwork', JSON.stringify(valid));
            } catch {}
            return;
          }
        }
      } catch (err) {
        // Fallback per classroom
        if (Array.isArray(classrooms) && classrooms.length > 0) {
          try {
            const promises = classrooms.map(c =>
              apiFetch(`${import.meta.env.VITE_API_URL}/classwork/${c.id}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => (d && Array.isArray(d.classwork)) ? d.classwork.map(item => ({ ...item, classroom_id: c.id })) : [])
                .catch(() => [])
            );
            const results = await Promise.all(promises);
            const merged = results.flat().filter(
              item => !item.archived && !isLegacyHardcoded(item) && !!item.dueDate
            );
            if (!cancelled && merged.length > 0) {
              setActivities(merged);
            }
          } catch {}
        }
      }
    };

    fetchAllActivities();

    const handleStorage = (e) => {
      if (e.key?.startsWith('verity_classwork_') || e.key === 'verity_cached_classwork') {
        setActivities(getCachedActivities());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
    };
  }, [classrooms]);

  const getStartOfWeek = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    return start;
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    return day;
  });

  const goPrevWeek = () => {
    setLoading(true);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
    setTimeout(() => setLoading(false), 160);
  };

  const goNextWeek = () => {
    setLoading(true);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
    setTimeout(() => setLoading(false), 160);
  };

  const goToday = () => {
    setLoading(true);
    setCurrentDate(new Date());
    setTimeout(() => setLoading(false), 160);
  };

  const getWeekString = () => {
    const sm = MONTHS[startOfWeek.getMonth()];
    const sd = startOfWeek.getDate();
    const em = MONTHS[endOfWeek.getMonth()];
    const ed = endOfWeek.getDate();
    const y = endOfWeek.getFullYear();
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) return `${sm} ${sd} - ${ed}, ${y}`;
    return `${sm} ${sd} - ${em} ${ed}, ${y}`;
  };

  const isToday = (date) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const selectedClassName = filterClass === 'all' 
    ? 'All classes' 
    : classrooms?.find(c => c.id.toString() === filterClass)?.name || 'All classes';

  const processedActivities = activities
    .filter(a => {
      if (filterClass === 'all') return true;
      return String(a.classroom_id || a.classId) === String(filterClass);
    })
    .map(act => {
      const parsedDate = parseDueDate(act.dueDate);
      const classObj = classrooms?.find(c => String(c.id) === String(act.classroom_id || act.classId));
      return {
        ...act,
        parsedDate,
        className: classObj?.name || '',
        formattedTime: formatDueTime(act),
        color: getActivityColor(act)
      };
    })
    .filter(act => act.parsedDate !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '620px', position: 'relative' }}>
      {/* ─── TOOLBAR: dropdown left | week nav right ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        position: 'relative',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Class filter dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 14px',
              width: '210px',
              border: isDark ? '1.5px solid #4A4A4A' : '1.5px solid #cbd5e1', 
              borderRadius: '8px',
              color: isDark ? '#E8EAED' : '#1f2937',
              fontWeight: '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              userSelect: 'none',
              backgroundColor: isDark ? '#262626' : '#ffffff',
              boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedClassName}
            </span>
            <ChevronDown size={17} color={isDark ? '#a3a3a3' : '#64748b'} />
          </div>

          {isDropdownOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setIsDropdownOpen(false)}
              />
              <div style={{ 
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '240px',
                marginTop: '6px',
                backgroundColor: isDark ? '#282828' : '#ffffff',
                border: isDark ? '1px solid #484848' : '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.55)' : '0 10px 25px rgba(0,0,0,0.1)',
                zIndex: 50,
                overflow: 'hidden',
                maxHeight: '260px',
                overflowY: 'auto',
                color: isDark ? '#E8EAED' : '#1f2937'
              }}>
                <div 
                  onClick={() => { setFilterClass('all'); setIsDropdownOpen(false); }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: filterClass === 'all' ? '600' : '400',
                    borderBottom: isDark ? '1px solid #3c3c3c' : '1px solid #f1f5f9',
                    backgroundColor: filterClass === 'all' ? (isDark ? '#383838' : '#f8fafc') : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>All classes</span>
                  {filterClass === 'all' && <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✓</span>}
                </div>
                {classrooms?.map(cls => (
                  <div 
                    key={cls.id}
                    onClick={() => { setFilterClass(cls.id.toString()); setIsDropdownOpen(false); }}
                    style={{ 
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      fontWeight: filterClass === cls.id.toString() ? '600' : '400',
                      borderBottom: isDark ? '1px solid #3c3c3c' : '1px solid #f1f5f9',
                      backgroundColor: filterClass === cls.id.toString() ? (isDark ? '#383838' : '#f8fafc') : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.name}
                    </span>
                    {filterClass === cls.id.toString() && <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✓</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Week navigation (Today button + Prev arrow + Date range + Next arrow) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={goToday}
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: '600',
              backgroundColor: isDark ? '#2c2c2c' : '#ffffff',
              color: isDark ? '#E8EAED' : '#334155',
              border: isDark ? '1.5px solid #484848' : '1.5px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: isDark 
                ? '0 0 12px rgba(255, 255, 255, 0.05), 0 2px 6px rgba(0, 0, 0, 0.35)' 
                : '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="btn-anim"
          >
            Today
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
            <button
              onClick={goPrevWeek}
              style={{
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDark ? '1px solid #404040' : '1px solid #e2e8f0',
                backgroundColor: isDark ? '#262626' : '#ffffff',
                color: isDark ? '#d4d4d4' : '#475563',
                boxShadow: isDark 
                  ? '0 0 10px rgba(255, 255, 255, 0.04), 0 1px 4px rgba(0, 0, 0, 0.3)' 
                  : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              title="Previous week"
              className="btn-anim"
            >
              <ChevronLeft size={18} />
            </button>

            <span style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: isDark ? '#E8EAED' : '#1f2937',
              minWidth: '160px',
              textAlign: 'center',
              padding: '0 6px',
              userSelect: 'none'
            }}>
              {getWeekString()}
            </span>

            <button
              onClick={goNextWeek}
              style={{
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDark ? '1px solid #404040' : '1px solid #e2e8f0',
                backgroundColor: isDark ? '#262626' : '#ffffff',
                color: isDark ? '#d4d4d4' : '#475563',
                boxShadow: isDark 
                  ? '0 0 10px rgba(255, 255, 255, 0.04), 0 1px 4px rgba(0, 0, 0, 0.3)' 
                  : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              title="Next week"
              className="btn-anim"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── CALENDAR GRID ─── */}
      {loading ? (
        <Skeleton.Calendar />
      ) : (
        <div style={{
          display: 'flex',
          flex: 1,
          minHeight: '540px',
          border: isDark ? '1px solid #3c3c3c' : '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: isDark ? '#242424' : '#ffffff',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.04)'
        }}>
          {weekDays.map((day, idx) => {
            const today = isToday(day);
            const daysActivities = processedActivities.filter(a => 
              a.parsedDate.getFullYear() === day.getFullYear() && 
              a.parsedDate.getMonth() === day.getMonth() && 
              a.parsedDate.getDate() === day.getDate()
            );
            return (
              <div key={idx} style={{ 
                flex: 1,
                minWidth: 0,
                borderRight: idx < 6 ? (isDark ? '1px solid #3c3c3c' : '1px solid #e2e8f0') : 'none', 
                display: 'flex', 
                flexDirection: 'column',
                backgroundColor: today 
                  ? (isDark ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.02)') 
                  : (isDark ? '#242424' : '#ffffff')
              }}>
                {/* Day Header */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '14px 6px 12px', 
                  borderBottom: isDark ? '1px solid #3c3c3c' : '1px solid #e2e8f0',
                  backgroundColor: today 
                    ? (isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)') 
                    : (isDark ? '#282828' : '#fafafa')
                }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: today ? '#10b981' : (isDark ? '#a3a3a3' : '#64748b'), 
                    fontWeight: '700', 
                    letterSpacing: '0.05em',
                    marginBottom: '4px' 
                  }}>
                    {WEEKDAYS[day.getDay()]}
                  </span>
                  <div style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: today ? '#10b981' : 'transparent',
                    color: today ? '#ffffff' : (isDark ? '#E8EAED' : '#1e293b'),
                    fontSize: '1.2rem', 
                    fontWeight: today ? '700' : '500',
                    boxShadow: today ? '0 2px 8px rgba(16,185,129,0.35)' : 'none'
                  }}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Day Activities List */}
                <div style={{
                  flex: 1,
                  minHeight: '440px',
                  padding: '10px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto'
                }}>
                  {daysActivities.map(act => (
                    <div 
                      key={act.id} 
                      onClick={() => setSelectedActivity(act)}
                      style={{ 
                        backgroundColor: act.color || '#3b82f6', 
                        borderRadius: '6px', 
                        padding: '8px 9px',
                        color: '#ffffff', 
                        fontSize: '0.75rem', 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '3px', 
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }} 
                      className="btn-anim"
                      title={`${act.title} (Due ${act.formattedTime})`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '0.66rem', opacity: 0.95 }}>
                          {act.type || 'Assignment'}
                        </span>
                        <span style={{ fontSize: '0.66rem', opacity: 0.9, flexShrink: 0 }}>
                          {act.formattedTime}
                        </span>
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.78rem', lineHeight: '1.25', wordBreak: 'break-word' }}>
                        {act.title}
                      </div>
                      {act.className && (
                        <div style={{ fontSize: '0.66rem', opacity: 0.88, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {act.className}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ACTIVITY DETAILS MODAL ─── */}
      {selectedActivity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedActivity(null)}
        >
          <div
            style={{
              backgroundColor: isDark ? '#262626' : '#ffffff',
              color: isDark ? '#E8EAED' : '#1f2937',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: isDark ? '0 20px 35px rgba(0,0,0,0.6)' : '0 20px 35px rgba(0,0,0,0.15)',
              border: isDark ? '1px solid #3c3c3c' : '1px solid #e5e7eb',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{
                backgroundColor: selectedActivity.color,
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {selectedActivity.type || 'Assignment'}
              </span>
              <button
                onClick={() => setSelectedActivity(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#a3a3a3' : '#6b7280',
                  display: 'flex',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700', lineHeight: 1.3 }}>
              {selectedActivity.title}
            </h3>

            {selectedActivity.className && (
              <div style={{ fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#4b5563', marginBottom: '14px', fontWeight: '500' }}>
                Class: <span style={{ color: isDark ? '#E8EAED' : '#111827', fontWeight: '600' }}>{selectedActivity.className}</span>
              </div>
            )}

            <div style={{
              backgroundColor: isDark ? '#1e1e1e' : '#f8fafc',
              border: isDark ? '1px solid #383838' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Clock size={18} color={selectedActivity.color} />
              <div>
                <div style={{ fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#64748b' }}>Due Date</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: isDark ? '#E8EAED' : '#0f172a' }}>
                  {selectedActivity.parsedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} at {selectedActivity.formattedTime}
                </div>
              </div>
            </div>

            {selectedActivity.details && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: isDark ? '#a3a3a3' : '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Instructions
                </div>
                <div style={{
                  fontSize: '0.88rem',
                  lineHeight: '1.5',
                  color: isDark ? '#d1d5db' : '#334155',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedActivity.details}
                </div>
              </div>
            )}

            {selectedActivity.points && (
              <div style={{ fontSize: '0.82rem', color: isDark ? '#9ca3af' : '#64748b', marginBottom: '18px' }}>
                Points: <span style={{ fontWeight: '600', color: isDark ? '#E8EAED' : '#111827' }}>{selectedActivity.points} pts</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedActivity(null)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: isDark ? '#383838' : '#e5e7eb',
                  color: isDark ? '#E8EAED' : '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
