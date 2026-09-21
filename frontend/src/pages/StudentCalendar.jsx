import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import Skeleton from '../components/Skeleton';

const MOCK_ACTIVITIES = [
  {
    id: 1,
    classId: 1,
    title: 'ASSIGNMENT 1 — HCI PROPOSAL',
    type: 'Assignment',
    time: '11:59 PM',
    date: new Date(2026, 8, 2),
    color: '#3b82f6'
  },
  {
    id: 2,
    classId: 2,
    title: 'QUIZ 1 — DATA STRUCTURES',
    type: 'Quiz',
    time: '10:00 AM',
    date: new Date(2026, 8, 4),
    color: '#10b981'
  }
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StudentCalendar({ classrooms }) {
  const { isDark } = useDarkMode();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 2));
  const [filterClass, setFilterClass] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setTimeout(() => setLoading(false), 180);
  };

  const goNextWeek = () => {
    setLoading(true);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
    setTimeout(() => setLoading(false), 180);
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

  const filteredActivities = MOCK_ACTIVITIES.filter(a => filterClass === 'all' || a.classId.toString() === filterClass);

  const isToday = (date) => date.getFullYear() === 2026 && date.getMonth() === 8 && date.getDate() === 4;

  const selectedClassName = filterClass === 'all' 
    ? 'All classes' 
    : classrooms.find(c => c.id.toString() === filterClass)?.name || 'All classes';

  return (
    <div  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 15px', width: '220px', border: isDark ? '1.5px solid #444444' : '1.5px solid #2563eb', 
              borderRadius: '6px', color: isDark ? '#E8EAED' : '#1f2937', fontWeight: '500', cursor: 'pointer', userSelect: 'none',
              backgroundColor: isDark ? '#242424' : 'white'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedClassName}</span>
            <ChevronDown size={18} color={isDark ? '#a3a3a3' : '#2563eb'} />
          </div>
          {isDropdownOpen && (
            <div style={{ 
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px',
              backgroundColor: isDark ? '#323232' : 'white', border: isDark ? '1px solid #4A4A4A' : '1px solid #e5e7eb', borderRadius: '6px',
              boxShadow: isDark ? '0 10px 20px rgba(0,0,0,0.5)' : '0 10px 15px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden',
              color: isDark ? '#E8EAED' : '#1f2937'
            }}>
              <div 
                onClick={() => { setFilterClass('all'); setIsDropdownOpen(false); }}
                style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #f3f4f6', backgroundColor: filterClass === 'all' ? (isDark ? '#3C3C3C' : '#f3f4f6') : (isDark ? '#323232' : 'white') }}
              >
                All classes
              </div>
              {classrooms.map(cls => (
                <div 
                  key={cls.id}
                  onClick={() => { setFilterClass(cls.id.toString()); setIsDropdownOpen(false); }}
                  style={{ 
                    padding: '10px 15px', cursor: 'pointer', borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #f3f4f6',
                    backgroundColor: filterClass === cls.id.toString() ? (isDark ? '#3C3C3C' : '#f3f4f6') : (isDark ? '#323232' : 'white'),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                >
                  {cls.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, justifyContent: 'center', paddingRight: '220px' }}>
          <div onClick={goPrevWeek} style={{ cursor: 'pointer', padding: '5px' }}>
            <ChevronLeft size={20} color={isDark ? '#d4d4d4' : '#4b5563'} />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: '600', color: isDark ? '#E8EAED' : '#1f2937', minWidth: '180px', textAlign: 'center' }}>
            {getWeekString()}
          </span>
          <div onClick={goNextWeek} style={{ cursor: 'pointer', padding: '5px' }}>
            <ChevronRight size={20} color={isDark ? '#d4d4d4' : '#4b5563'} />
          </div>
        </div>
      </div>
      {loading ? (
        <Skeleton.Calendar />
      ) : (
        <div style={{ display: 'flex', flex: 1, border: isDark ? '1px solid #383838' : '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        {weekDays.map((day, idx) => {
          const today = isToday(day);
          const daysActivities = filteredActivities.filter(a => 
            a.date.getFullYear() === day.getFullYear() && a.date.getMonth() === day.getMonth() && a.date.getDate() === day.getDate()
          );
          return (
            <div key={idx} style={{ flex: 1, borderRight: idx < 6 ? (isDark ? '1px solid #383838' : '1px solid #e5e7eb') : 'none', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid transparent' }}>
                <span style={{ fontSize: '0.8rem', color: today ? '#10b981' : (isDark ? '#a3a3a3' : '#6b7280'), fontWeight: '600', marginBottom: '5px' }}>
                  {WEEKDAYS[day.getDay()]}
                </span>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: today ? '#10b981' : 'transparent',
                  color: today ? 'white' : (isDark ? '#E8EAED' : '#1f2937'),
                  fontSize: '1.4rem', fontWeight: '500'
                }}>
                  {day.getDate()}
                </div>
              </div>
              <div style={{ flex: 1, padding: '10px 5px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {daysActivities.map(act => (
                  <div key={act.id} style={{ 
                    backgroundColor: act.color || '#3b82f6', borderRadius: '4px', padding: '8px 10px',
                    color: 'white', fontSize: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer'
                  }} className="btn-anim">
                    <div style={{ fontWeight: '700', textTransform: 'uppercase' }}>{act.type}:</div>
                    <div style={{ fontWeight: '600', lineHeight: '1.2' }}>{act.title}</div>
                    <div style={{ marginTop: '2px', opacity: 0.9 }}>{act.time}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
