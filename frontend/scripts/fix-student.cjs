const fs = require('fs');

let content = fs.readFileSync('c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx', 'utf8');
let original = content;

// 1. Add ClassroomSettings import
content = content.replace(
  /import StudentCalendar from '\.\/StudentCalendar';/,
  "import StudentCalendar from './StudentCalendar';\nimport ClassroomSettings from './ClassroomSettings';"
);

// 2. Add settingsClassroom state
content = content.replace(
  /const \[activeMenu, setActiveMenu\] = useState\(null\);/,
  "const [activeMenu, setActiveMenu] = useState(null);\n  const [settingsClassroom, setSettingsClassroom] = useState(null);"
);

// 3. Filter sidebar
content = content.replace(
  /\{classrooms\.map\(\(cls, i\) => \{/g,
  "{classrooms.filter(c => !c.archived).map((cls, i) => {"
);

// 4. Update the archive logic
// Wait, StudentDashboard has `handleArchiveClass` that only sets `archiveConfirmId(id)`. 
// I'll update it to actually archive.
content = content.replace(
  /const handleArchiveClass = \(e, id\) => \{\s*e\.stopPropagation\(\);\s*setArchiveConfirmId\(id\);\s*setActiveMenu\(null\);\s*\};/,
  `const handleArchiveClass = (e, id) => {
    e.stopPropagation();
    setClassrooms(classrooms.map(c => c.id === id ? { ...c, archived: true } : c));
    setActiveMenu(null);
  };`
);

// 5. Replace the entire rendering block
// Find: {activeView === 'calendar' ? ( ... ) : ( ... )}
// I will replace it using string split/concat to avoid regex complexities with huge blocks.

const startToken = `{activeView === 'calendar' ? (`;
const startIndex = content.indexOf(startToken);
const endIndex = content.indexOf(`{/* INPUT CLASS CODE MODAL */}`);

if (startIndex !== -1 && endIndex !== -1) {
  const newRenderingLogic = `
          {activeView === 'calendar' && (
            <StudentCalendar classrooms={classrooms} />
          )}

          {activeView === 'classroomSettings' && settingsClassroom && (
            <ClassroomSettings 
              classroom={settingsClassroom} 
              onClose={() => { setSettingsClassroom(null); handleSetView('classrooms'); }}
            />
          )}

          {activeView === 'archived' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 10px' }}>
                <h2 style={{ color: '#4b5563', margin: 0 }}>Archived Classrooms</h2>
              </div>
              
              {classrooms.filter(c => c.archived).length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <h3 style={{ margin: 0 }}>No Archived Classrooms</h3>
                  <p style={{ marginTop: '10px' }}>Classrooms you archive will appear here.</p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {classrooms.filter(c => c.archived).map(cls => (
                    <div key={cls.id} style={{...styles.cardContainer, opacity: 0.7}} onClick={() => onEnterClassroom(cls)}>
                      <div style={styles.cardPill}>{cls.code}</div>

                      <div style={styles.cardBody}>
                        <h3 style={{ color: '#4b5563', margin: '0 0 10px 0' }}>{cls.name}</h3>
                        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>{cls.instructor}</p>

                        <div style={styles.dots} onClick={(e) => toggleMenu(e, cls.id)}>
                          <MoreVertical size={18} />
                        </div>

                        {activeMenu === cls.id && (
                          <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.dropdownItem} onClick={(e) => handleUnarchiveClass(e, cls.id)}>Restore</div>
                            <div style={{...styles.dropdownItem, color: '#ef4444'}} onClick={(e) => { e.stopPropagation(); handleDelete(e, cls.id); setActiveMenu(null); }}>Delete</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'classrooms' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 10px' }}>
                <h2 style={{ color: '#4b5563', margin: 0 }}>My Classrooms</h2>
                <button onClick={() => { setJoinError(''); setClassCode(''); setIsModalOpen(true); }} style={styles.addButton}>
                  <Plus size={18} style={{ marginRight: '5px' }} /> Add
                </button>
              </div>

              {/* Classroom Grid */}
              <div style={styles.grid}>
                {classrooms.filter(c => !c.archived).map(cls => (
                  <div key={cls.id} style={styles.cardContainer} onClick={() => onEnterClassroom(cls)}>
                    <div style={styles.cardPill}>{cls.code}</div>

                    <div style={styles.cardBody}>
                      <h3 style={{ color: '#4b5563', margin: '0 0 10px 0' }}>{cls.name}</h3>
                      <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>{cls.instructor}</p>

                      <div style={styles.dots} onClick={(e) => toggleMenu(e, cls.id)}>
                        <MoreVertical size={18} />
                      </div>

                      {activeMenu === cls.id && (
                        <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.dropdownItem} onClick={(e) => handleArchiveClass(e, cls.id)}>Archive</div>
                          <div style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); setSettingsClassroom(cls); handleSetView('classroomSettings'); setActiveMenu(null); }}>Settings</div>
                          <div style={{...styles.dropdownItem, color: '#ef4444'}} onClick={(e) => { e.stopPropagation(); handleDelete(e, cls.id); setActiveMenu(null); }}>Delete</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      `;

  content = content.substring(0, startIndex) + newRenderingLogic + content.substring(endIndex);
}

if (content !== original) {
  fs.writeFileSync('c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx', content, 'utf8');
  console.log('Fixed StudentDashboard.jsx');
}
