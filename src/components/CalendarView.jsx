import React, { useState, useMemo, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { 
  formatInTimeZone, 
  fromZonedTime,
  toZonedTime
} from 'date-fns-tz';
import { 
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, parseISO,
  format, startOfDay, addMinutes, differenceInMinutes, getDay
} from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Bot,
  User,
  Clock,
  X,
  AlignLeft,
  Check,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { createAppointment, cancelAppointment } from '../services/appointmentService';

const TZ = 'America/Sao_Paulo';

export default function CalendarView() {
  const { appointments, contacts, theme } = useCrm();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    contact_id: '',
    title: '',
    description: '',
    start_time: '', // local HH:mm
    date: '' // local YYYY-MM-DD
  });

  // Filter out cancelled appointments from the view
  const activeAppointments = useMemo(() => 
    appointments.filter(a => a.status !== 'cancelled'), 
  [appointments]);

  // Navigation handlers
  const next = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const prev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const today = () => setCurrentDate(new Date());

  // Render Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Days of week header */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} style={{ background: 'var(--bg-surface)', padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {d}
          </div>
        ))}

        {/* Days grid */}
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          
          // Get appointments for this day
          const dayAppointments = activeAppointments.filter(app => {
            // Convert app start time to local to compare days
            const localStart = toZonedTime(new Date(app.start_time), TZ);
            return isSameDay(localStart, day);
          });

          return (
            <div 
              key={i}
              onClick={(e) => {
                if (e.target.closest('.appointment-card')) return;
                setSelectedDayDate(day);
                setIsDayModalOpen(true);
              }}
              style={{
                minHeight: '120px',
                background: isCurrentMonth ? 'var(--bg-surface)' : 'var(--bg-app)',
                padding: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                opacity: isCurrentMonth ? 1 : 0.6
              }}
              className="calendar-cell"
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '8px' 
              }}>
                <span style={{ 
                  width: '28px', 
                  height: '28px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: '50%',
                  background: isToday ? 'var(--accent-primary)' : 'transparent',
                  color: isToday ? '#fff' : 'var(--text-primary)',
                  fontWeight: isToday ? 'bold' : 'normal',
                  fontSize: '14px'
                }}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayAppointments.slice(0, 3).map(app => (
                  <div 
                    key={app.id}
                    className="appointment-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      const localStart = toZonedTime(new Date(app.start_time), TZ);
                      setFormData({
                        id: app.id,
                        contact_id: app.contact_id,
                        title: app.title,
                        description: app.description || '',
                        date: format(localStart, 'yyyy-MM-dd'),
                        start_time: format(localStart, 'HH:mm')
                      });
                      setIsModalOpen(true);
                    }}
                    style={{
                    fontSize: '11px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    background: app.created_by === 'ai' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    borderLeft: `2px solid ${app.created_by === 'ai' ? '#8b5cf6' : '#10b981'}`,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer'
                  }}>
                    {app.created_by === 'ai' ? <Bot size={10} color="#8b5cf6"/> : <User size={10} color="#10b981"/>}
                    {formatInTimeZone(app.start_time, TZ, 'HH:mm')} - {app.title}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '2px' }}>
                    +{dayAppointments.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!formData.contact_id || !formData.date || !formData.start_time || !formData.title) return;

    try {
      // Assemble local datetime string
      const localDateTimeStr = `${formData.date}T${formData.start_time}:00`; // e.g. "2026-07-01T14:00:00"
      
      // Convert local Sao Paulo time to UTC Date object for Supabase
      const utcDate = fromZonedTime(localDateTimeStr, TZ);
      
      // Calculate end time (+1 hour for V1 standard slot)
      const endUtcDate = addMinutes(utcDate, 60);

      if (formData.id) {
        // Edit existing
        const { updateAppointment } = await import('../services/appointmentService');
        await updateAppointment(formData.id, {
          contact_id: formData.contact_id,
          title: formData.title,
          description: formData.description,
          start_time: utcDate.toISOString(),
          end_time: endUtcDate.toISOString(),
        });
      } else {
        // Create new
        await createAppointment({
          contact_id: formData.contact_id,
          title: formData.title,
          description: formData.description,
          start_time: utcDate.toISOString(),
          end_time: endUtcDate.toISOString(),
          created_by: 'human',
          status: 'scheduled'
        });
      }

      setIsModalOpen(false);
      setFormData({ id: null, contact_id: '', title: '', description: '', start_time: '', date: '' });
    } catch (err) {
      alert("Erro ao salvar agendamento. Pode haver conflito de horário.");
      console.error(err);
    }
  };

  const handleCancelAppointment = async () => {
    if (!formData.id) return;
    if (!window.confirm("Deseja realmente cancelar este agendamento?")) return;
    
    try {
      await cancelAppointment(formData.id);
      setIsModalOpen(false);
      setFormData({ id: null, contact_id: '', title: '', description: '', start_time: '', date: '' });
    } catch (err) {
      alert("Erro ao cancelar agendamento.");
      console.error(err);
    }
  };

  return (
    <div className="content-wrapper animated-fade-in" style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{
          background: 'var(--accent-primary)',
          color: '#fff',
          padding: '8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 4px 12px var(--accent-glow)'
        }}>
          <CalendarIcon size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>Agenda</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Gerencie seus agendamentos e horários.</p>
        </div>
      </div>

      {/* Calendar Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, textTransform: 'capitalize', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={today} className="btn-animated" style={{ 
              padding: '8px 16px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>Hoje</button>
            <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={prev} className="cal-nav-btn"><ChevronLeft size={18} /></button>
              <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
              <button onClick={next} className="cal-nav-btn"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '4px' }}>
            {['month', 'week', 'day'].map(v => (
              <button 
                key={v}
                onClick={() => setView(v)}
                className="btn-animated"
                style={{
                  padding: '6px 12px',
                  background: view === v ? 'var(--accent-primary)' : 'transparent',
                  color: view === v ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>

          <button className="glass-btn btn-animated" onClick={() => {
            setFormData({ id: null, contact_id: '', title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), start_time: '' });
            setIsModalOpen(true);
          }}>
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Calendar Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {view === 'month' ? renderMonthView() : (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CalendarIcon size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Visão em desenvolvimento</h3>
            <p>A visão de {view === 'week' ? 'Semana' : 'Dia'} será implementada em breve.</p>
          </div>
        )}
      </div>

      {/* CSS for calendar */}
      <style>{`
        .calendar-cell:hover {
          background: var(--bg-surface-hover) !important;
        }
        .appointment-card {
          transition: all 0.2s;
        }
        .appointment-card:hover {
          transform: translateX(2px);
          filter: brightness(1.2);
        }
        .cal-nav-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          padding: 8px;
          cursor: pointer;
          display: flex;
          alignItems: center;
          justifyContent: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cal-nav-btn:hover {
          background: rgba(255,255,255,0.05);
          transform: translateY(-1px);
        }
        .cal-nav-btn:active {
          transform: scale(0.95);
        }
        .btn-animated {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-animated:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .btn-animated:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* Create Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '450px', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--accent-primary)"/> {formData.id ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Cliente</label>
                <select 
                  className="glass-input" 
                  required
                  value={formData.contact_id}
                  onChange={e => setFormData({...formData, contact_id: e.target.value})}
                >
                  <option value="">Selecione um cliente...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Título / Procedimento</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  required
                  placeholder="Ex: Avaliação Estética"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Data</label>
                  <input 
                    type="date" 
                    className="glass-input" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Horário (SP)</label>
                  <input 
                    type="time" 
                    className="glass-input" 
                    required
                    value={formData.start_time}
                    onChange={e => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {formData.id ? (
                  <button type="button" onClick={handleCancelAppointment} className="btn-animated" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
                    <Trash2 size={14} /> Excluir
                  </button>
                ) : <div/>}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn-animated" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="glass-btn btn-animated" style={{ padding: '8px 16px' }}>
                    {formData.id ? 'Salvar Edição' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Day Details Modal */}
      {isDayModalOpen && selectedDayDate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '450px', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={18} color="var(--accent-primary)"/> {format(selectedDayDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <button onClick={() => setIsDayModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const dayApps = activeAppointments.filter(app => {
                  const localStart = toZonedTime(new Date(app.start_time), TZ);
                  return isSameDay(localStart, selectedDayDate);
                });
                
                if (dayApps.length === 0) {
                  return <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '14px' }}>Nenhum agendamento para este dia.</div>;
                }
                
                return dayApps.map(app => (
                  <div key={app.id} className="appointment-card" style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: app.created_by === 'ai' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderLeft: `3px solid ${app.created_by === 'ai' ? '#8b5cf6' : '#10b981'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {formatInTimeZone(app.start_time, TZ, 'HH:mm')} - {app.title}
                        {app.created_by === 'ai' && <Bot size={14} color="#8b5cf6"/>}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12}/> {app.contacts?.name || 'Cliente'}
                      </div>
                    </div>
                    <button 
                      className="btn-animated"
                      onClick={() => {
                        const localStart = toZonedTime(new Date(app.start_time), TZ);
                        setFormData({
                          id: app.id,
                          contact_id: app.contact_id,
                          title: app.title,
                          description: app.description || '',
                          date: format(localStart, 'yyyy-MM-dd'),
                          start_time: format(localStart, 'HH:mm')
                        });
                        setIsDayModalOpen(false);
                        setIsModalOpen(true);
                      }}
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', padding: '6px 12px', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Editar
                    </button>
                  </div>
                ));
              })()}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
              <button 
                className="glass-btn btn-animated" 
                style={{ width: '100%', padding: '10px' }}
                onClick={() => {
                  setFormData({ id: null, contact_id: '', title: '', description: '', start_time: '', date: format(selectedDayDate, 'yyyy-MM-dd') });
                  setIsDayModalOpen(false);
                  setIsModalOpen(true);
                }}
              >
                <Plus size={16}/> Novo Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
