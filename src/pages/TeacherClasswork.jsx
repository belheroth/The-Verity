import React, { useState, useEffect, useRef } from 'react';
import ProfileMenu from './ProfileMenu';
import { Calendar, ClipboardList, Settings, User, MoreVertical, ArrowLeft, X, Link2, Image, Video, Monitor, Menu, Home, Archive } from 'lucide-react';

const EMPTY_FORM = { title: '', noDueDate: true, dueDate: '', instruction: '', points: '100', grading: 'On', attachments: [] };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Format a date as "Sep 7". Accepts a "YYYY-MM-DD" string (parsed in local time
// to avoid an off-by-one), an ISO string, or a timestamp number. Returns '' if empty.
const formatShortDate = (value) => {
  if (!value) return '';
  let d;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

const DEFAULT_CLASSWORK = [
  { id: 1, title: "Activity 1: Hello World & Variables", details: "Write a C# program that declares a string for your name, an int for your age, and prints them.", archived: false },
  { id: 2, title: "Activity 2: Loops and Conditions", details: "Create a for-loop counting 1 to 50. Use an if-statement to only print the even numbers.", archived: false }
];

export default function TeacherClasswork({ classroom, onBack, onLogout, onStartMonitoring, onOpenGrading, socket, onEnterClassroom }) {
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem('verity_teacher_classrooms');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('verity_sidebar_collapsed') === 'true');
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('verity_sidebar_collapsed', next);
  };
  const navRef_classrooms = useRef(null);
  const navRef_calendar = useRef(null);
  const navRef_archived = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });
  const [enrolledIndicator, setEnrolledIndicator] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });
  const enrolledRefs = useRef({});

  useEffect(() => {
    const timer = setTimeout(() => {
        let activeRef = null;
        if (activeRef && activeRef.current) {
              const el = activeRef.current;
              setIndicatorStyle(prev => {
                  if (prev.top === el.offsetTop && prev.height === el.offsetHeight && prev.opacity === 1) return prev;
                  sessionStorage.setItem('verity_nav_top', el.offsetTop); return { top: el.offsetTop, height: el.offsetHeight, opacity: 1 };
              });
          } else {
              setIndicatorStyle(prev => {
                  if (prev.opacity === 0) return prev;
                  return { ...prev, opacity: 0 };
              });
          }
        
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



  // Persist classwork per classroom so it survives a refresh.
  const storageKey = `verity_classwork_${classroom?.id ?? 'default'}`;
  const classroomId = classroom?.id ?? 'default';

  const [classwork, setClasswork] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_CLASSWORK;
    } catch {
      return DEFAULT_CLASSWORK;
    }
  });

  // Track whether the first server load has happened, so we don't broadcast
  // the initial fetched/default list straight back to the server.
  const hydrated = useRef(false);

// Load the authoritative classwork list from the backend on mount so it
    // syncs across machines (not just this browser's localStorage).
    useEffect(() => {
      let cancelled = false;
      fetch(`${import.meta.env.VITE_API_URL}/classwork/${classroomId}`)
        .then(res => res.json())
        .then(data => {
          if (cancelled) return;
          if (Array.isArray(data.classwork) && data.classwork.length > 0) {
            setClasswork(data.classwork);
          }
        })
        .catch(() => { /* offline — fall back to localStorage copy */ })
        .finally(() => { hydrated.current = true; });
      return () => { cancelled = true; };
    }, [classroomId]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(classwork));
    // Push every change to the backend so students on other machines see it.
    if (hydrated.current && socket) {
      socket.emit('classwork_updated', { classroomId, classwork });
    }
  }, [classwork, storageKey, classroomId, socket]);

  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  // Real "Turned in" / "Assigned" numbers from the backend.
  const [submissionData, setSubmissionData] = useState({ counts: {}, studentCount: 0 });

  const toggleExpand = (id) => setExpandedId(prev => (prev === id ? null : id));

// Load submission counts on mount and refresh periodically so "Turned in"
// updates as students submit.
    useEffect(() => {
      const load = () => {
        fetch(`${import.meta.env.VITE_API_URL}/submission-counts`)
          .then(res => res.json())
          .then(data => setSubmissionData({ counts: data.counts || {}, studentCount: data.studentCount || 0 }))
          .catch(() => { /* offline — leave previous numbers */ });
      };
      load();
      const interval = setInterval(load, 10000);
      return () => clearInterval(interval);
    }, []);

  // Modal state — also reused for "Modify" (edit) by tracking editingId.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Read a file as a base64 data URL, send it to the backend, and return the
  // stored attachment ({ type, name, url }). Falls back to an inline data URL
  // if the server can't be reached so the preview still works offline.
const uploadFile = (file, type) => new Promise((resolve) => {
     const reader = new FileReader();
     reader.onload = async () => {
       const dataUrl = reader.result;
       try {
         const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ filename: file.name, dataUrl })
         });
         const data = await res.json();
         resolve({ type, name: file.name, url: data.url });
       } catch {
         resolve({ type, name: file.name, url: dataUrl });
       }
     };
     reader.readAsDataURL(file);
   });

  const handleFilePicked = async (e, type) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setUploading(true);
    const attachment = await uploadFile(file, type);
    setForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), attachment] }));
    setUploading(false);
  };

  const handleAddLink = () => {
    const url = window.prompt('Paste a link (URL):');
    if (!url) return;
    const trimmed = url.trim();
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), { type: 'link', name: trimmed, url: normalized }] }));
  };

  const removeAttachment = (index) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };
  const handleDeleteClasswork = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this classwork?")) {
      setClasswork(classwork.filter(c => c.id !== id));
    }
    setActiveMenu(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openModify = (e, item) => {
    e.stopPropagation();
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      noDueDate: item.dueDate ? false : true,
      dueDate: item.dueDate || '',
      instruction: item.details || '',
      points: item.points || '100',
      grading: item.grading || 'On',
      attachments: item.attachments || []
    });
    setActiveMenu(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      title: form.title,
      details: form.instruction, // "details" drives the card body
      dueDate: form.noDueDate ? '' : form.dueDate,
      points: form.points,
      grading: form.grading,
      attachments: form.attachments || []
    };

    if (editingId) {
      setClasswork(classwork.map(item =>
        item.id === editingId ? { ...item, ...data } : item
      ));
    } else {
      setClasswork([{ id: Date.now(), archived: false, posted: new Date().toISOString(), ...data }, ...classwork]);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleArchive = (e, id) => {
    e.stopPropagation();
    setClasswork(classwork.map(item => item.id === id ? { ...item, archived: true } : item));
    setActiveMenu(null);
  };

  const handleCopy = (e, item) => {
    e.stopPropagation();
    const copy = { ...item, id: Date.now(), title: `${item.title} (Copy)` };
    setClasswork([copy, ...classwork]);
    setActiveMenu(null);
  };

  const visibleClasswork = classwork.filter(item => !item.archived);

  return (
    <div style={styles.container}>

      {/* LEFT SIDEBAR */}
      <div style={{ ...styles.sidebar, width: collapsed ? '110px' : '250px', padding: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', whiteSpace: 'nowrap', width: 'max-content', transform: collapsed ? 'translateX(13px)' : 'none', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <Menu size={24} color="#10b981" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={toggleSidebar} />
          <div style={styles.logoContainer}>
          <span style={styles.logoV}>V</span>
            <span style={styles.logoText}>erity</span>
          {!collapsed && <span style={styles.badge}>Instructor</span>}
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
          transition: 'top 0.6s cubic-bezier(0.5, 1.6, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
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
          transition: 'top 0.6s cubic-bezier(0.5, 1.6, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
          opacity: enrolledIndicator.opacity,
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={styles.navGroup}>
          
          
          <div ref={navRef_classrooms} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'classrooms'); onBack(); }}>
            <Home size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Home</span>}
          </div>
          <div ref={navRef_calendar} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'calendar'); onBack(); }}>
            <Calendar size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Calendar</span>}
          </div>
          <div ref={navRef_archived} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'archived'); onBack(); }}>
            <Archive size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Archived</span>}
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
            {classrooms.filter(c => !c.archived).map((cls) => {
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              const color = colors[cls.id % colors.length];
              
              return (
                <div 
                  key={cls.id} ref={el => enrolledRefs.current['cls_' + cls.id] = el}
                  style={{...styles.navItem, ...(classroom?.id === cls.id ? styles.activeNavItem : {}), justifyContent: collapsed ? 'center' : 'flex-start'}} 
                  onClick={() => { if (onEnterClassroom) onEnterClassroom(cls); }}
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
        
        

        <div style={{...styles.navItem, position: 'relative', zIndex: 1, marginTop: 'auto', padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'settings'); onBack(); }}>
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

          <div style={styles.headerRow}>
            <h2 style={{ color: '#4b5563', margin: 0 }}>
              {classroom ? classroom.name : "Classwork"}
            </h2>
            <button onClick={openCreate} style={styles.addButton}>Add</button>
          </div>

          {/* List of Classwork */}
          <div style={styles.list}>
            {visibleClasswork.length === 0 && (
              <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
                No classwork yet. Click "Add" to create one.
              </p>
            )}

            {visibleClasswork.map((item) => {
              const isOpen = expandedId === item.id;
              const due = formatShortDate(item.dueDate);
              const posted = formatShortDate(item.posted || (typeof item.id === 'number' && item.id > 1e12 ? item.id : null));
              return (
                <div key={item.id} style={styles.itemWrapper}>

                  <div style={styles.itemHeader}>
                    <div style={styles.titlePill} onClick={() => toggleExpand(item.id)}>{item.title}</div>
                    <div style={styles.threeDots} onClick={(e) => toggleMenu(e, item.id)}>
                      <MoreVertical size={20} />

                      {activeMenu === item.id && (
                        <div style={styles.dropdownMenu}>
                          <div style={styles.dropdownItem} onClick={(e) => openModify(e, item)}>Modify</div>
                          <div style={styles.dropdownItem} onClick={(e) => handleArchive(e, item.id)}>Archive</div>
                          <div style={styles.dropdownItem} onClick={(e) => handleCopy(e, item)}>Copy</div>
                          <div style={{ ...styles.dropdownItem, color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDeleteClasswork(e, item.id); setActiveMenu(null); }}>Delete</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail view (click the title to toggle) */}
                  {isOpen && (
                    <div style={styles.detailCard}>

                      {/* Header bar: clipboard icon + title + due date */}
                      <div style={styles.detailHeaderBar}>
                        <ClipboardList size={30} color="#4b5563" />
                        <div>
                          <div style={styles.detailTitle}>{item.title}</div>
                          <div style={styles.detailDue}>{due ? `Due ${due}` : 'No Due Date'}</div>
                        </div>
                      </div>

                      {/* Body: posted date + instruction + attachments, with stats on the right */}
                      <div style={styles.detailBody}>
                        <div style={styles.detailLeft}>
                          {posted && <div style={styles.postedText}>Posted {posted}</div>}
                          <p style={styles.detailInstruction}>{item.details}</p>

                          {item.attachments?.length > 0 && (
                            <div style={styles.cardAttachments}>
                              {item.attachments.map((att, i) => {
                                if (att.type === 'image') {
                                  return <a key={i} href={att.url} target="_blank" rel="noreferrer"><img src={att.url} alt={att.name} style={styles.attachThumb} /></a>;
                                }
                                if (att.type === 'video') {
                                  return <video key={i} src={att.url} controls style={styles.attachVideo} />;
                                }
                                return (
                                  <a key={i} href={att.url} target="_blank" rel="noreferrer" style={styles.attachLink}>
                                    <Link2 size={14} style={{ marginRight: '6px' }} /> {att.name}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div style={styles.detailStats}>
                          <div style={styles.statCol}>
                            <span style={styles.statNum}>{submissionData.counts[item.id] || 0}</span>
                            <span style={styles.statLabel}>Turned in</span>
                          </div>
                          <div style={styles.statColDivider} />
                          <div style={styles.statCol}>
                            <span style={styles.statNum}>{submissionData.studentCount}</span>
                            <span style={styles.statLabel}>Assigned</span>
                          </div>
                        </div>
                      </div>

                      <div style={styles.detailDivider} />

                      <div style={styles.detailFooter}>
                        <span
                          style={styles.viewActivityLink}
                          onClick={() => onOpenGrading && onOpenGrading(item)}
                        >
                          View Activity
                        </span>
                        <button
                          style={styles.liveMonitorBtn}
                          onClick={(e) => { e.stopPropagation(); onStartMonitoring && onStartMonitoring(item); }}
                          title="Open live monitoring"
                        >
                          <Monitor size={16} /> Live Monitoring
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ASSIGNMENT MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Assignment</h2>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeModalBtn}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Title */}
              <label style={styles.fieldLabel}>Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={styles.input}
              />

              {/* Due Date */}
              <div style={styles.labelRow}>
                <label style={styles.fieldLabel}>Due Date</label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.noDueDate}
                    onChange={(e) => setForm({ ...form, noDueDate: e.target.checked })}
                  />
                  No Due Date
                </label>
              </div>
              <input
                type="date"
                disabled={form.noDueDate}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                style={{ ...styles.input, opacity: form.noDueDate ? 0.5 : 1 }}
              />

              {/* Instruction */}
              <div style={styles.labelRow}>
                <label style={styles.fieldLabel}>Instruction</label>
                <div style={styles.attachIcons}>
                  <Link2 size={18} style={styles.attachIcon} title="Add link" onClick={handleAddLink} />
                  <Image size={18} style={styles.attachIcon} title="Upload image" onClick={() => imageInputRef.current?.click()} />
                  <Video size={18} style={styles.attachIcon} title="Upload video" onClick={() => videoInputRef.current?.click()} />
                </div>
              </div>
              <textarea
                value={form.instruction}
                onChange={(e) => setForm({ ...form, instruction: e.target.value })}
                style={{ ...styles.input, height: '90px', resize: 'vertical', fontFamily: 'inherit' }}
              />

              {/* Hidden file pickers driven by the icons above */}
              <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFilePicked(e, 'image')} />
              <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFilePicked(e, 'video')} />

              {uploading && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Uploading…</span>}

              {/* Attached items */}
              {form.attachments?.length > 0 && (
                <div style={styles.attachmentList}>
                  {form.attachments.map((att, i) => (
                    <div key={i} style={styles.attachmentChip}>
                      {att.type === 'image' && <Image size={14} />}
                      {att.type === 'video' && <Video size={14} />}
                      {att.type === 'link' && <Link2 size={14} />}
                      <span style={styles.attachmentName} title={att.name}>{att.name}</span>
                      <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeAttachment(i)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Points */}
              <label style={styles.fieldLabel}>Points</label>
              <select
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                style={{ ...styles.input, width: '120px' }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>

              {/* Grading + Assign */}
              <div style={styles.bottomRow}>
                <div style={styles.gradingGroup}>
                  <span style={styles.fieldLabel}>Grading:</span>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="grading"
                      checked={form.grading === 'On'}
                      onChange={() => setForm({ ...form, grading: 'On' })}
                    />
                    On
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="grading"
                      checked={form.grading === 'Off'}
                      onChange={() => setForm({ ...form, grading: 'Off' })}
                    />
                    Off
                  </label>
                </div>
                <button type="submit" style={styles.assignBtn}>{editingId ? 'Save' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// STYLES (matching the dashboard / classroom look)
const styles = {
  container: { minHeight: '100vh', width: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif', position: 'relative' },
  sidebar: { width: '250px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10, height: '100%', boxSizing: 'border-box', overflowX: 'hidden', position: 'relative', transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' },
  logoContainer: { display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },
  logoV: { color: '#10b981' },
  logoText: { color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  badge: {  fontSize: '0.7rem', backgroundColor: '#4b5563', color: 'white', padding: '3px 8px', borderRadius: '10px', marginLeft: '6px', fontStyle: 'normal', transform: 'translateY(-5px)' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
  navItem: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', borderRadius: '14px' , whiteSpace: 'nowrap' },
  activeNavItem: { color: '#10b981', fontWeight: '700' },
  settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column', zIndex: 1 },
  topBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  logoutButton: { padding: '8px 15px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  profileCircle: { width: '50px', height: '50px', backgroundColor: '#d1d5db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' },
  whiteCard: { backgroundColor: 'white', flex: 1, borderRadius: '24px', padding: 'clamp(20px, 4vw, 40px)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflowY: 'auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  addButton: { display: 'flex', alignItems: 'center', padding: '10px 30px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' },
  list: { display: 'flex', flexDirection: 'column', gap: '30px' },
  itemWrapper: { display: 'flex', flexDirection: 'column', gap: '10px' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titlePill: { backgroundColor: '#d1d5db', padding: '8px 20px', borderRadius: '50px', color: '#4b5563', fontWeight: 'bold', display: 'inline-block', cursor: 'pointer', userSelect: 'none' },
  threeDots: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' },
  dropdownMenu: { position: 'absolute', top: '28px', right: '0', backgroundColor: '#9ca3af', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10, minWidth: '120px' },
  dropdownItem: { padding: '6px 15px', color: 'black', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', borderRadius: '6px' },

  // Expanded assignment detail card
  detailCard: { backgroundColor: 'white', borderRadius: '16px', padding: '0', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', overflow: 'hidden' },
  detailHeaderBar: { display: 'flex', alignItems: 'center', gap: '18px', backgroundColor: '#e5e7eb', padding: '18px 25px', borderRadius: '16px', margin: '12px' },
  detailTitle: { fontSize: '1.4rem', fontWeight: 'bold', color: '#374151' },
  detailDue: { fontSize: '0.9rem', color: '#6b7280', marginTop: '2px' },
  detailBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', padding: '5px 30px 20px 30px' },
  detailLeft: { flex: 1 },
  postedText: { fontSize: '0.85rem', color: '#9ca3af', marginBottom: '10px' },
  detailInstruction: { margin: 0, color: '#374151', fontSize: '1.05rem', lineHeight: 1.5 },
  detailStats: { display: 'flex', alignItems: 'stretch', gap: '0', paddingLeft: '20px' },
  statCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 22px', minWidth: '70px' },
  statColDivider: { width: '1px', backgroundColor: '#d1d5db', alignSelf: 'stretch' },
  statNum: { fontSize: '1.4rem', fontWeight: 'bold', color: '#374151' },
  statLabel: { fontSize: '0.95rem', color: '#4b5563', marginTop: '4px' },
  detailDivider: { height: '1px', backgroundColor: '#e5e7eb', margin: '0 30px' },
  detailFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 30px' },
  viewActivityLink: { color: '#374151', fontSize: '1rem', cursor: 'pointer', fontWeight: '500' },
  liveMonitorBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 22px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' },

  // Modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalCard: { backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  closeModalBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' },
  form: { display: 'flex', flexDirection: 'column', gap: '8px' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#4b5563', fontSize: '1rem', boxSizing: 'border-box' },
  fieldLabel: { fontSize: '0.9rem', fontWeight: 'bold', color: '#4b5563', marginTop: '8px' },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer' },
  attachIcons: { display: 'flex', gap: '12px', color: '#6b7280' },
  attachIcon: { cursor: 'pointer' },
  attachmentList: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' },
  attachmentChip: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', color: '#4b5563' },
  attachmentName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardAttachments: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '15px', alignItems: 'flex-start' },
  attachThumb: { maxWidth: '140px', maxHeight: '100px', borderRadius: '8px', objectFit: 'cover', display: 'block' },
  attachVideo: { maxWidth: '220px', maxHeight: '140px', borderRadius: '8px', backgroundColor: '#000' },
  attachLink: { display: 'inline-flex', alignItems: 'center', color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem', wordBreak: 'break-all' },
  bottomRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' },
  gradingGroup: { display: 'flex', alignItems: 'center', gap: '15px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', color: '#4b5563', cursor: 'pointer' },
  assignBtn: { padding: '10px 40px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' }
};
