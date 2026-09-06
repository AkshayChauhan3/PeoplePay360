import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_DAYS = [
  { day_of_week: 0, enabled: true, start_time: '09:00:00', end_time: '18:00:00', break_minutes: 60 },
  { day_of_week: 1, enabled: true, start_time: '09:00:00', end_time: '18:00:00', break_minutes: 60 },
  { day_of_week: 2, enabled: true, start_time: '09:00:00', end_time: '18:00:00', break_minutes: 60 },
  { day_of_week: 3, enabled: true, start_time: '09:00:00', end_time: '18:00:00', break_minutes: 60 },
  { day_of_week: 4, enabled: true, start_time: '09:00:00', end_time: '18:00:00', break_minutes: 60 },
  { day_of_week: 5, enabled: false, start_time: '09:00:00', end_time: '18:00:00', break_minutes: 60 },
  { day_of_week: 6, enabled: false, start_time: '09:00:00', end_time: '18:00:00', break_minutes: 60 },
];

const formatTimeString = (t) => {
  if (!t) return '--:--';
  const parts = t.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
  return t;
};

const calculateWorkHours = (start, end, breakMins) => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  const netMin = Math.max(0, totalMin - (Number(breakMins) || 0));
  return Math.round((netMin / 60) * 100) / 100;
};

const SchedulesView = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ type: '', text: '' });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    calendar_type: 'STANDARD',
    is_active: true,
    days: DEFAULT_DAYS,
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 4000);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getSchedules();
      setSchedules(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load working schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      name: '',
      calendar_type: 'STANDARD',
      is_active: true,
      days: DEFAULT_DAYS.map(d => ({ ...d })),
    });
    setShowModal(true);
  };

  const openEditModal = (sched) => {
    setEditingSchedule(sched);
    // Map existing lines to 7 days
    const daysMap = {};
    (sched.lines || []).forEach(l => {
      daysMap[l.day_of_week] = {
        day_of_week: l.day_of_week,
        enabled: true,
        start_time: l.start_time.length === 5 ? `${l.start_time}:00` : l.start_time,
        end_time: l.end_time.length === 5 ? `${l.end_time}:00` : l.end_time,
        break_minutes: l.break_minutes,
      };
    });

    const fullDays = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      if (daysMap[dow]) return daysMap[dow];
      return {
        day_of_week: dow,
        enabled: false,
        start_time: '09:00:00',
        end_time: '18:00:00',
        break_minutes: 60,
      };
    });

    setFormData({
      name: sched.name,
      calendar_type: sched.calendar_type || 'STANDARD',
      is_active: sched.is_active,
      days: fullDays,
    });
    setShowModal(true);
  };

  const handleDayChange = (dow, field, value) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map(d => d.day_of_week === dow ? { ...d, [field]: value } : d),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Please provide a schedule name.');
      return;
    }

    const workingLines = formData.days
      .filter(d => d.enabled)
      .map(d => ({
        day_of_week: d.day_of_week,
        start_time: d.start_time.length === 5 ? `${d.start_time}:00` : d.start_time,
        end_time: d.end_time.length === 5 ? `${d.end_time}:00` : d.end_time,
        break_minutes: parseInt(d.break_minutes, 10) || 0,
      }));

    if (workingLines.length === 0) {
      showToast('error', 'Please configure at least one working day.');
      return;
    }

    // Verify start < end
    for (const line of workingLines) {
      const wh = calculateWorkHours(line.start_time, line.end_time, line.break_minutes);
      if (wh <= 0) {
        showToast('error', `Invalid shift on ${DAY_NAMES[line.day_of_week]}: End time must be after start time and exceed break duration.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editingSchedule) {
        await apiService.updateSchedule(editingSchedule.id, {
          name: formData.name.trim(),
          calendar_type: formData.calendar_type.trim(),
          is_active: formData.is_active,
          lines: workingLines,
        });
        showToast('success', `Schedule '${formData.name}' updated successfully.`);
      } else {
        await apiService.createSchedule({
          name: formData.name.trim(),
          calendar_type: formData.calendar_type.trim(),
          lines: workingLines,
        });
        showToast('success', `Schedule '${formData.name}' created successfully.`);
      }
      setShowModal(false);
      fetchSchedules();
    } catch (err) {
      showToast('error', err?.response?.data?.detail || 'Failed to save working schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sched) => {
    if (!window.confirm(`Are you sure you want to delete working schedule '${sched.name}'?`)) {
      return;
    }
    try {
      await apiService.deleteSchedule(sched.id);
      showToast('success', `Schedule '${sched.name}' deleted.`);
      fetchSchedules();
    } catch (err) {
      showToast('error', err?.response?.data?.detail || 'Failed to delete schedule.');
    }
  };

  // Preview total hours for modal
  const modalTotalHours = formData.days
    .filter(d => d.enabled)
    .reduce((sum, d) => sum + calculateWorkHours(d.start_time, d.end_time, d.break_minutes), 0);
  const modalTotalDays = formData.days.filter(d => d.enabled).length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Toast Alert */}
      {toast.text && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 600,
          fontSize: '0.9rem',
          backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#15803d' : '#b91c1c',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
        }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            OPERATIONS & ATTENDANCE • A3 MODULE
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: '4px 0 0 0' }}>
            Working Schedules
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Define standard work schedules, shifts, break hours, and weekly expected time.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> New Working Schedule
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading working schedules...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#b91c1c' }}>
          {error}
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>No working schedules defined yet.</p>
          <button onClick={openCreateModal} className="btn-primary">Create Standard Schedule</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {schedules.map(sched => (
            <div
              key={sched.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {sched.name}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                    }}>
                      {sched.calendar_type}
                    </span>
                  </div>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: sched.is_active ? '#dcfce7' : '#f1f5f9',
                    color: sched.is_active ? '#15803d' : '#64748b',
                  }}>
                    {sched.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Weekly Hours</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{sched.hours_per_week} hrs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Work Days</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{sched.days_per_week} days</div>
                  </div>
                </div>

                {/* Day lines summary */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Shift Coverage ({sched.lines?.length || 0} days)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(sched.lines || []).map(line => (
                      <div
                        key={line.id || line.day_of_week}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          padding: '4px 8px',
                          backgroundColor: '#fdfdfd',
                          borderRadius: '4px',
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#334155', minWidth: '90px' }}>
                          {DAY_NAMES[line.day_of_week]}
                        </span>
                        <span style={{ color: '#64748b' }}>
                          {formatTimeString(line.start_time)} – {formatTimeString(line.end_time)}
                        </span>
                        <span style={{ fontWeight: 600, color: '#0f766e' }}>
                          {line.work_hours}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => openEditModal(sched)}
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  Edit Schedule
                </button>
                <button
                  onClick={() => handleDelete(sched)}
                  style={{
                    fontSize: '0.82rem',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                {editingSchedule ? 'Edit Working Schedule' : 'Create Working Schedule'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. Standard 40 Hours/Week"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Calendar Type
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="STANDARD / FLEXIBLE"
                    value={formData.calendar_type}
                    onChange={e => setFormData({ ...formData, calendar_type: e.target.value })}
                  />
                </div>
              </div>

              {editingSchedule && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Is Active Schedule
                  </label>
                </div>
              )}

              {/* Day Lines Config */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Weekly Work Shift Configuration
                  </label>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f766e' }}>
                    Total: {modalTotalHours.toFixed(2)} hrs / {modalTotalDays} days
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formData.days.map((day) => {
                    const dailyHours = day.enabled
                      ? calculateWorkHours(day.start_time, day.end_time, day.break_minutes)
                      : 0;

                    return (
                      <div
                        key={day.day_of_week}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '130px 1fr 1fr 100px 70px',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: day.enabled ? '#f8fafc' : '#f1f5f9',
                          borderRadius: '6px',
                          border: day.enabled ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                          opacity: day.enabled ? 1 : 0.65,
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={day.enabled}
                            onChange={e => handleDayChange(day.day_of_week, 'enabled', e.target.checked)}
                          />
                          {DAY_NAMES[day.day_of_week]}
                        </label>

                        <div>
                          <input
                            type="time"
                            disabled={!day.enabled}
                            className="form-input"
                            style={{ width: '100%', height: '32px', fontSize: '0.8rem' }}
                            value={day.start_time.slice(0, 5)}
                            onChange={e => handleDayChange(day.day_of_week, 'start_time', `${e.target.value}:00`)}
                          />
                        </div>

                        <div>
                          <input
                            type="time"
                            disabled={!day.enabled}
                            className="form-input"
                            style={{ width: '100%', height: '32px', fontSize: '0.8rem' }}
                            value={day.end_time.slice(0, 5)}
                            onChange={e => handleDayChange(day.day_of_week, 'end_time', `${e.target.value}:00`)}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            disabled={!day.enabled}
                            className="form-input"
                            style={{ width: '100%', height: '32px', fontSize: '0.8rem' }}
                            placeholder="Break m"
                            title="Break duration in minutes"
                            value={day.break_minutes}
                            onChange={e => handleDayChange(day.day_of_week, 'break_minutes', e.target.value)}
                          />
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: day.enabled ? '#0f766e' : '#94a3b8' }}>
                          {day.enabled ? `${dailyHours.toFixed(1)}h` : '--'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulesView;

