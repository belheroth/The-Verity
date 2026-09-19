const fs = require('fs');

let content = fs.readFileSync('c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx', 'utf8');

const replacement = `                letterSpacing: '0.05em',
                marginBottom: '5px'
              }}>
                Enrolled
              </div>
            )}
            {classrooms.filter(c => !c.archived).map((cls, i) => {
              // Generate a deterministic color based on the index or ID
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              const color = colors[cls.id % colors.length];
              
              return (
                <div 
                  key={cls.id} 
                  style={{...styles.navItem, justifyContent: collapsed ? 'center' : 'flex-start'}} 
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

        <div style={{...styles.navItem}} onClick={() => setIsSettingsOpen(true)} title="Settings">`;

content = content.replace(
  /                letterSpacing: '0\.05em',\s*<div style=\{\{\.\.\.styles\.navItem\}\} onClick=\{\(\) => setIsSettingsOpen\(true\)\} title="Settings">/,
  replacement
);

fs.writeFileSync('c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx', content, 'utf8');
console.log('Fixed broken chunk in StudentDashboard.jsx');
