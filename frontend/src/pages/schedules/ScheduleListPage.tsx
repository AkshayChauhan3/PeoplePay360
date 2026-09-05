import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { ScheduleOut, ScheduleIn, ScheduleLine } from '../../types/api';
import { Modal } from '../../components/common/Modal';
import { Plus, Clock } from 'lucide-react';

export const ScheduleListPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const list = await apiService.getSchedules();
      setSchedules(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: ScheduleIn = {
        name,
        lines: [
          { day_of_week: 0, start_time: '09:00:00', end_time: '18:00:00', break_hours: 1 },
          { day_of_week: 1, start_time: '09:00:00', end_time: '18:00:00', break_hours: 1 },
          { day_of_week: 2, start_time: '09:00:00', end_time: '18:00:00', break_hours: 1 },
          { day_of_week: 3, start_time: '09:00:00', end_time: '18:00:00', break_hours: 1 },
          { day_of_week: 4, start_time: '09:00:00', end_time: '18:00:00', break_hours: 1 },
        ],
      };
      await apiService.createSchedule(payload);
      setIsModalOpen(false);
      setName('');
      fetchSchedules();
    } catch (e: any) {
      alert(e.message || 'Failed to create schedule');
    }
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Working Schedules & Shift Calendars</h1>
          <p>Configured work hours, daily break durations, and weekly contract time derivations.</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>Create Working Schedule</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {schedules.map((sched) => (
            <div key={sched.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-success">{sched.hours_per_week} Hours / Week</span>
                <Clock size={18} color="var(--primary)" />
              </div>

              <h3 style={{ fontSize: '16px', marginTop: '12px' }}>{sched.name}</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {sched.days_per_week} working days per cycle
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                  Weekly Shift Breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sched.lines.map((l: ScheduleLine, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-control)',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{dayNames[l.day_of_week] || `Day ${l.day_of_week}`}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {l.start_time.slice(0, 5)} - {l.end_time.slice(0, 5)} (Break: {l.break_hours}h)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Working Schedule"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleCreate}>Save Schedule</button>
          </>
        }
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Schedule Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Standard 40h Shift (Mon-Fri)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Initializes standard 5-day enterprise working shift (09:00 - 18:00 with 1h lunch break). Total hours per week will be derived automatically by the engine.
          </div>
        </form>
      </Modal>
    </div>
  );
};
