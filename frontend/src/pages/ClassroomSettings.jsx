import React, { useState } from 'react';
import { X, Copy, Maximize, Settings as SettingsIcon } from 'lucide-react';

export default function ClassroomSettings({ classroom, onClose, role = 'teacher' }) {
  const [formData, setFormData] = useState({
    name: classroom.name || '',
    description: classroom.description || '',
    section: classroom.section || '',
    level: classroom.level || '',
    subject: classroom.subject || '',
    room: classroom.room || ''
  });

  const [general, setGeneral] = useState({
    inviteCodes: 'Turned on',
    stream: 'Students can post and comment',
    classworkStream: 'Show condensed notifications',
    showDeleted: false
  });

  const [grading, setGrading] = useState({
    autoDraftGrade: true,
    defaultGrade: 0,
    overallCalculation: 'No overall grade',
    showOverallToStudents: false
  });

  const handleSave = () => {
    // In a real app, this would pass the data back up and save to backend.
    // For now, we will just close.
    onClose();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onClose} style={styles.iconButton} title="Close">
            <X size={24} />
          </button>
          <span style={styles.headerTitle}>Class settings</span>
        </div>
        {role !== 'student' && (
          <button onClick={handleSave} style={styles.saveButton}>Save</button>
        )}
      </div>

      <div style={styles.scrollArea}>
        <div style={styles.content}>

          {/* CLASS DETAILS */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Class Details</h2>
            
            <div style={styles.inputGroup}>
              <div style={styles.inputWrapper}>
                <label style={styles.floatingLabel}>Class name (required)</label>
                <input 
                  style={styles.input} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  readOnly={role === 'student'}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.inputWrapper}>
                <label style={styles.floatingLabel}>Class description</label>
                <input 
                  style={styles.input} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  readOnly={role === 'student'}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.inputWrapper}>
                <label style={styles.floatingLabel}>Section</label>
                <input 
                  style={styles.input} 
                  value={formData.section} 
                  onChange={e => setFormData({...formData, section: e.target.value})} 
                  readOnly={role === 'student'}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.inputWrapper}>
                <label style={styles.floatingLabel}>Level(s)</label>
                <input 
                  style={styles.input} 
                  value={formData.level} 
                  onChange={e => setFormData({...formData, level: e.target.value})} 
                  readOnly={role === 'student'}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.inputWrapper}>
                <label style={styles.floatingLabel}>Subject</label>
                <input 
                  style={styles.input} 
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})} 
                  readOnly={role === 'student'}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.inputWrapper}>
                <label style={styles.floatingLabel}>Room</label>
                <input 
                  style={styles.input} 
                  value={formData.room} 
                  onChange={e => setFormData({...formData, room: e.target.value})} 
                  readOnly={role === 'student'}
                />
              </div>
            </div>
          </div>

          {/* GENERAL */}
          {role !== 'student' && (
            <>
              <div style={styles.card}>
              <h2 style={styles.sectionTitle}>General</h2>

            <div style={styles.subSection}>
              <h3 style={styles.subSectionTitle}>Invite codes</h3>
              
              <div style={styles.rowItem}>
                <div>
                  <div style={styles.rowLabel}>Manage invite codes</div>
                  <div style={styles.rowDesc}>Settings apply to both invite links and class codes</div>
                </div>
                <select 
                  style={styles.selectText}
                  value={general.inviteCodes}
                  onChange={e => setGeneral({...general, inviteCodes: e.target.value})}
                >
                  <option>Turned on</option>
                  <option>Turned off</option>
                  <option>Reset</option>
                </select>
              </div>

              <div style={styles.rowItem}>
                <div style={styles.rowLabel}>Invite link</div>
                <div style={styles.rowActionGroup}>
                  <span style={styles.rowValue}>https://classroom.google.com/c/OD...</span>
                  <Copy size={18} style={styles.actionIcon} />
                </div>
              </div>

              <div style={styles.rowItem}>
                <div style={styles.rowLabel}>Class code</div>
                <div style={styles.rowValue}>{classroom.code || 'vji3bku4'}</div>
              </div>

              <div style={styles.rowItem}>
                <div style={styles.rowLabel}>Class view</div>
                <div style={styles.rowActionGroup}>
                  <span style={styles.linkText}>Display class code</span>
                  <Maximize size={18} style={{...styles.actionIcon, color: '#1a73e8'}} />
                </div>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.subSection}>
              <h3 style={styles.subSectionTitle}>Stream and classwork</h3>
              
              <div style={styles.rowItem}>
                <div style={styles.rowLabel}>Stream</div>
                <select 
                  style={styles.selectBox}
                  value={general.stream}
                  onChange={e => setGeneral({...general, stream: e.target.value})}
                >
                  <option>Students can post and comment</option>
                  <option>Students can only comment</option>
                  <option>Only teachers can post or comment</option>
                </select>
              </div>

              <div style={styles.rowItem}>
                <div style={styles.rowLabel}>Classwork on the Stream</div>
                <select 
                  style={styles.selectBox}
                  value={general.classworkStream}
                  onChange={e => setGeneral({...general, classworkStream: e.target.value})}
                >
                  <option>Show condensed notifications</option>
                  <option>Show attachments and details</option>
                  <option>Hide notifications</option>
                </select>
              </div>

              <div style={styles.rowItem}>
                <div>
                  <div style={styles.rowLabel}>Show deleted items</div>
                  <div style={styles.rowDesc}>Only teachers can view deleted items.</div>
                </div>
                <label style={styles.toggleSwitch}>
                  <input type="checkbox" checked={general.showDeleted} onChange={e => setGeneral({...general, showDeleted: e.target.checked})} style={styles.toggleInput} />
                  <div style={general.showDeleted ? styles.toggleSliderActive : styles.toggleSlider}>
                    <div style={general.showDeleted ? styles.toggleCircleActive : styles.toggleCircle}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* GRADING */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Grading</h2>

            <div style={styles.subSection}>
              <h3 style={styles.subSectionTitle}>Draft grade for missing assignments</h3>
              <p style={styles.paragraph}>When a student hasn't turned in their submission by the due date, or you have marked the submission as missing, it will automatically receive a draft grade. Students won't see this grade until you return it.</p>
              
              <div style={styles.rowItem}>
                <div style={styles.rowLabel}>Automatically apply a draft grade to Missing assignments</div>
                <label style={styles.toggleSwitch}>
                  <input type="checkbox" checked={grading.autoDraftGrade} onChange={e => setGrading({...grading, autoDraftGrade: e.target.checked})} style={styles.toggleInput} />
                  <div style={grading.autoDraftGrade ? styles.toggleSliderActive : styles.toggleSlider}>
                    <div style={grading.autoDraftGrade ? styles.toggleCircleActive : styles.toggleCircle}></div>
                  </div>
                </label>
              </div>

              {grading.autoDraftGrade && (
                <div style={{...styles.inputWrapper, width: '150px', marginTop: '15px'}}>
                  <label style={styles.floatingLabel}>Default grade</label>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <input 
                      type="number"
                      style={{...styles.input, borderBottom: 'none'}} 
                      value={grading.defaultGrade} 
                      onChange={e => setGrading({...grading, defaultGrade: e.target.value})} 
                    />
                    <span style={{paddingRight: '15px', color: '#5f6368'}}>%</span>
                  </div>
                  <div style={{height: '2px', backgroundColor: '#1a73e8', width: '100%'}}></div>
                </div>
              )}
            </div>

            <div style={styles.divider} />

            <div style={styles.subSection}>
              <h3 style={styles.subSectionTitle}>Grade calculation</h3>
              
              <div style={styles.rowItem}>
                <div>
                  <div style={styles.rowLabel}>Overall grade calculation</div>
                  <div style={styles.rowDesc}>Choose a grading system. <span style={styles.linkText}>Learn more</span></div>
                </div>
                <select 
                  style={styles.selectBox}
                  value={grading.overallCalculation}
                  onChange={e => setGrading({...grading, overallCalculation: e.target.value})}
                >
                  <option>No overall grade</option>
                  <option>Total points</option>
                  <option>Weighted by category</option>
                </select>
              </div>

              <div style={styles.rowItem}>
                <div style={styles.rowLabel}>Show overall grade to students</div>
                <label style={styles.toggleSwitch}>
                  <input type="checkbox" checked={grading.showOverallToStudents} onChange={e => setGrading({...grading, showOverallToStudents: e.target.checked})} style={styles.toggleInput} disabled={grading.overallCalculation === 'No overall grade'} />
                  <div style={grading.showOverallToStudents ? styles.toggleSliderActive : (grading.overallCalculation === 'No overall grade' ? styles.toggleSliderDisabled : styles.toggleSlider)}>
                    <div style={grading.showOverallToStudents ? styles.toggleCircleActive : styles.toggleCircle}></div>
                  </div>
                </label>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.subSection}>
              <h3 style={styles.subSectionTitle}>Grade categories</h3>
              <div style={{...styles.linkText, marginTop: '10px', fontSize: '0.9rem', fontWeight: '500'}}>Add grade category</div>
            </div>
          </div>
          </>
          )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },
  header: {
    height: '64px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#5f6368',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '50%',
    transition: 'background-color 0.2s'
  },
  headerTitle: {
    fontSize: '1.25rem',
    color: '#3c4043',
    fontWeight: '400'
  },
  saveButton: {
    backgroundColor: 'transparent',
    color: '#1a73e8',
    border: 'none',
    fontWeight: '500',
    fontSize: '0.875rem',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '40px 20px'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #dadce0',
    padding: '32px'
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '400',
    color: '#202124',
    margin: '0 0 24px 0'
  },
  inputGroup: {
    marginBottom: '16px'
  },
  inputWrapper: {
    backgroundColor: '#f1f3f4',
    borderRadius: '4px 4px 0 0',
    borderBottom: '1px solid #5f6368',
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column'
  },
  floatingLabel: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginBottom: '2px'
  },
  input: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '1rem',
    color: '#202124',
    width: '100%',
    padding: '4px 0'
  },
  subSection: {
    marginBottom: '16px'
  },
  subSectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '400',
    color: '#202124',
    margin: '0 0 16px 0'
  },
  paragraph: {
    fontSize: '0.875rem',
    color: '#5f6368',
    lineHeight: '1.5',
    marginBottom: '24px'
  },
  rowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    minHeight: '48px'
  },
  rowLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#3c4043'
  },
  rowDesc: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginTop: '4px'
  },
  rowValue: {
    fontSize: '0.875rem',
    color: '#5f6368'
  },
  rowActionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  actionIcon: {
    color: '#5f6368',
    cursor: 'pointer'
  },
  linkText: {
    color: '#1a73e8',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  selectText: {
    color: '#1a73e8',
    background: 'transparent',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none'
  },
  selectBox: {
    backgroundColor: '#f1f3f4',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '0.875rem',
    color: '#3c4043',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '200px'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '24px 0'
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: '36px',
    height: '20px'
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#b9b9b9',
    transition: '.4s',
    borderRadius: '24px'
  },
  toggleSliderActive: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a73e8',
    transition: '.4s',
    borderRadius: '24px'
  },
  toggleSliderDisabled: {
    position: 'absolute',
    cursor: 'not-allowed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e0e0e0',
    transition: '.4s',
    borderRadius: '24px'
  },
  toggleCircle: {
    position: 'absolute',
    height: '14px',
    width: '14px',
    left: '3px',
    bottom: '3px',
    backgroundColor: 'white',
    transition: '.4s',
    borderRadius: '50%'
  },
  toggleCircleActive: {
    position: 'absolute',
    height: '14px',
    width: '14px',
    left: '3px',
    bottom: '3px',
    backgroundColor: 'white',
    transition: '.4s',
    borderRadius: '50%',
    transform: 'translateX(16px)'
  }
};
