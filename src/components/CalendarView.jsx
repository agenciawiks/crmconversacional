import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import {
  AlignLeft,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { cancelAppointment, createAppointment, updateAppointment } from '../services/appointmentService';

const TZ = 'America/Sao_Paulo';
const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const emptyForm = (date = new Date()) => ({
  id: null,
  contact_id: '',
  title: '',
  description: '',
  start_time: '',
  date: format(date, 'yyyy-MM-dd'),
});

const getLocalStart = (appointment) => toZonedTime(new Date(appointment.start_time), TZ);

function getContactLabel(appointment, contacts) {
  const linkedContact = contacts.find((contact) => String(contact.id) === String(appointment.contact_id));
  return appointment.contacts?.name || linkedContact?.name || 'Contato não identificado';
}

function AgendaEvent({ appointment, contacts, compact = false, onEdit }) {
  const contactName = getContactLabel(appointment, contacts);
  return (
    <button
      type="button"
      className={`agenda-event ${appointment.created_by === 'ai' ? 'is-ai' : 'is-human'} ${compact ? 'is-compact' : ''}`}
      onClick={() => onEdit(appointment)}
      aria-label={`Editar ${appointment.title}, ${formatInTimeZone(appointment.start_time, TZ, 'HH:mm')}, ${contactName}`}
    >
      <span className="agenda-event-time">{formatInTimeZone(appointment.start_time, TZ, 'HH:mm')}</span>
      <span className="agenda-event-copy"><strong>{appointment.title}</strong>{!compact && <small>{contactName}</small>}</span>
      <span className="agenda-event-source" title={appointment.created_by === 'ai' ? 'Criado pela IA' : 'Criado manualmente'}>
        {appointment.created_by === 'ai' ? <Bot size={12} aria-hidden="true" /> : <UserRound size={12} aria-hidden="true" />}
      </span>
    </button>
  );
}

export default function CalendarView() {
  const rootRef = useRef(null);
  const dialogRef = useRef(null);
  const dayDialogRef = useRef(null);
  const previousCalendarKey = useRef('');
  const { appointments = [], contacts = [], initialDataLoaded } = useCrm();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  const [formData, setFormData] = useState(() => emptyForm());
  const [contactQuery, setContactQuery] = useState('');
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== 'cancelled'),
    [appointments],
  );

  const sortedAppointments = useMemo(
    () => [...activeAppointments].sort((first, second) => new Date(first.start_time) - new Date(second.start_time)),
    [activeAppointments],
  );

  const todayDate = startOfDay(new Date());
  const todayAppointments = activeAppointments.filter((appointment) => isSameDay(getLocalStart(appointment), todayDate));
  const currentMonthAppointments = activeAppointments.filter((appointment) => isSameMonth(getLocalStart(appointment), currentDate));
  const aiAppointments = currentMonthAppointments.filter((appointment) => appointment.created_by === 'ai');
  const associatedContacts = new Set(currentMonthAppointments.map((appointment) => String(appointment.contact_id)).filter(Boolean)).size;
  const upcomingAppointments = sortedAppointments.filter((appointment) => getLocalStart(appointment) >= new Date()).slice(0, 5);

  const normalizedContactQuery = contactQuery.trim().toLocaleLowerCase('pt-BR');
  const visibleContacts = contacts.filter((contact) => !normalizedContactQuery || [contact.name, contact.phone, contact.email]
    .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedContactQuery))).slice(0, 10);
  const selectedContact = contacts.find((contact) => String(contact.id) === String(formData.contact_id));

  const appointmentsForDay = (day) => sortedAppointments.filter((appointment) => isSameDay(getLocalStart(appointment), day));

  const calendarTitle = view === 'day'
    ? format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : view === 'week'
      ? `${format(startOfWeek(currentDate), 'dd MMM', { locale: ptBR })} — ${format(endOfWeek(currentDate), 'dd MMM yyyy', { locale: ptBR })}`
      : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  const next = () => {
    if (view === 'month') setCurrentDate((date) => addMonths(date, 1));
    else if (view === 'week') setCurrentDate((date) => addWeeks(date, 1));
    else setCurrentDate((date) => addDays(date, 1));
  };

  const previous = () => {
    if (view === 'month') setCurrentDate((date) => subMonths(date, 1));
    else if (view === 'week') setCurrentDate((date) => subWeeks(date, 1));
    else setCurrentDate((date) => subDays(date, 1));
  };

  const openNewAppointment = (date = new Date()) => {
    setFormData(emptyForm(date));
    setContactQuery('');
    setContactPickerOpen(false);
    setConfirmDelete(false);
    setFormError('');
    setIsDayModalOpen(false);
    setIsModalOpen(true);
  };

  const openAppointmentEditor = (appointment) => {
    const localStart = getLocalStart(appointment);
    setFormData({
      id: appointment.id,
      contact_id: appointment.contact_id || '',
      title: appointment.title || '',
      description: appointment.description || '',
      date: format(localStart, 'yyyy-MM-dd'),
      start_time: format(localStart, 'HH:mm'),
    });
    setContactQuery('');
    setContactPickerOpen(false);
    setConfirmDelete(false);
    setFormError('');
    setIsDayModalOpen(false);
    setIsModalOpen(true);
  };

  const openDayDetails = (day) => {
    setSelectedDayDate(day);
    setIsDayModalOpen(true);
  };

  const handleSaveAppointment = async (event) => {
    event.preventDefault();
    if (!formData.contact_id || !formData.date || !formData.start_time || !formData.title.trim()) {
      setFormError('Preencha contato, título, data e horário para salvar.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const localDateTime = `${formData.date}T${formData.start_time}:00`;
      const startUtc = fromZonedTime(localDateTime, TZ);
      const endUtc = addMinutes(startUtc, 60);
      const payload = {
        contact_id: formData.contact_id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_time: startUtc.toISOString(),
        end_time: endUtc.toISOString(),
      };
      if (formData.id) await updateAppointment(formData.id, payload);
      else await createAppointment({ ...payload, created_by: 'human', status: 'scheduled' });
      setIsModalOpen(false);
      setFormData(emptyForm());
    } catch (error) {
      console.error('[Agenda] Erro ao salvar agendamento:', error);
      setFormError('Não foi possível salvar. Verifique se já existe um compromisso nesse horário e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!formData.id || isSaving) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await cancelAppointment(formData.id);
      setIsModalOpen(false);
      setFormData(emptyForm());
    } catch (error) {
      console.error('[Agenda] Erro ao cancelar agendamento:', error);
      setFormError('Não foi possível cancelar o agendamento. Tente novamente.');
    } finally {
      setIsSaving(false);
      setConfirmDelete(false);
    }
  };

  useEffect(() => {
    if (!isModalOpen && !isDayModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setIsModalOpen(false);
      setIsDayModalOpen(false);
      setContactPickerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDayModalOpen, isModalOpen]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;
    const context = gsap.context(() => {
      const pageHeader = root.querySelector('.agenda-page-header');
      const metricCards = [...root.querySelectorAll('.agenda-metric-card')];
      const toolbar = root.querySelector('.agenda-toolbar');
      const calendarPanels = [...root.querySelectorAll('.agenda-calendar-shell, .agenda-upcoming-card')];
      const dayCells = [...root.querySelectorAll('.agenda-day-cell, .agenda-week-day')].slice(0, 42);
      const events = [...root.querySelectorAll('.agenda-event')].slice(0, 18);
      const entranceTargets = [
        pageHeader,
        ...metricCards,
        toolbar,
        ...calendarPanels,
        ...dayCells,
        ...events,
      ].filter(Boolean);
      gsap.killTweensOf(entranceTargets);
      gsap.set(entranceTargets, { willChange: 'transform,opacity' });
      const timeline = gsap.timeline({
        delay: 0.06,
        defaults: { ease: 'power3.out' },
        onComplete: () => gsap.set(entranceTargets, { clearProps: 'transform,opacity,visibility,willChange' }),
      });
      if (pageHeader) timeline.fromTo('.agenda-page-header', { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0);
      if (metricCards.length) timeline.fromTo(metricCards, { autoAlpha: 0, y: 26, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.075 }, 0.15);
      if (toolbar) timeline.fromTo(toolbar, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.46 }, 0.34);
      if (calendarPanels.length) timeline.fromTo(calendarPanels, { autoAlpha: 0, y: 26, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.52, stagger: 0.08 }, 0.48);
      if (dayCells.length) timeline.fromTo(dayCells, { autoAlpha: 0, y: 12, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.018 }, 0.68);
      if (events.length) timeline.fromTo(events, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.28, stagger: 0.025 }, 0.84);

      const ambientOrbit = root.querySelector('.agenda-ambient-orbit');
      const metricIcons = [...root.querySelectorAll('.agenda-metric-icon')];
      if (ambientOrbit) gsap.to(ambientOrbit, { rotation: 360, duration: 28, repeat: -1, ease: 'none', transformOrigin: 'center' });
      if (metricIcons.length) gsap.to(metricIcons, { y: -3, rotation: (index) => index % 2 ? 4 : -4, duration: 1.8, repeat: -1, yoyo: true, stagger: 0.16, ease: 'sine.inOut' });
    }, root);
    return () => context.revert();
  }, [initialDataLoaded]);

  useLayoutEffect(() => {
    const key = `${view}-${format(currentDate, 'yyyy-MM-dd')}`;
    if (!initialDataLoaded || !previousCalendarKey.current) {
      previousCalendarKey.current = key;
      return undefined;
    }
    if (previousCalendarKey.current === key) return undefined;
    previousCalendarKey.current = key;
    const calendarView = rootRef.current?.querySelector('.agenda-calendar-view');
    if (!calendarView) return undefined;
    const tween = gsap.fromTo(calendarView, { autoAlpha: 0, x: view === 'day' ? 14 : 0, y: view === 'day' ? 0 : 10, scale: 0.993 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.4, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    return () => tween.kill();
  }, [currentDate, initialDataLoaded, view]);

  useLayoutEffect(() => {
    const dialog = isModalOpen ? dialogRef.current : dayDialogRef.current;
    if ((!isModalOpen && !isDayModalOpen) || !dialog) return undefined;
    const backdrop = dialog.closest('.agenda-modal-backdrop');
    const context = gsap.context(() => {
      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(dialog, { autoAlpha: 0, y: 24, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: 'back.out(1.55)' });
      gsap.fromTo(dialog.querySelectorAll('.agenda-modal-reveal'), { autoAlpha: 0, y: 9 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.04, delay: 0.13, ease: 'power3.out' });
    }, backdrop);
    return () => context.revert();
  }, [isDayModalOpen, isModalOpen]);

  useEffect(() => {
    const root = rootRef.current;
    const glow = root?.querySelector('.agenda-cursor-glow');
    if (!root || !glow) return undefined;
    gsap.set(glow, { xPercent: -50, yPercent: -50 });
    const moveX = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3.out' });
    const moveY = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3.out' });
    const handlePointerMove = (event) => { moveX(event.clientX); moveY(event.clientY); };
    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => root.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;
    const buttons = [...root.querySelectorAll('.agenda-animated-action, .agenda-event')];
    const cleanups = buttons.map((button) => {
      const enter = () => gsap.to(button, { y: -3, scale: 1.035, duration: 0.22, ease: 'back.out(2)', overwrite: 'auto' });
      const leave = () => gsap.to(button, { y: 0, scale: 1, duration: 0.26, ease: 'power3.out', overwrite: 'auto' });
      const down = () => gsap.to(button, { y: 0, scale: 0.95, duration: 0.11, ease: 'power2.out', overwrite: 'auto' });
      button.addEventListener('pointerenter', enter);
      button.addEventListener('pointerleave', leave);
      button.addEventListener('pointerdown', down);
      return () => {
        button.removeEventListener('pointerenter', enter);
        button.removeEventListener('pointerleave', leave);
        button.removeEventListener('pointerdown', down);
      };
    });
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(buttons);
    };
  }, [activeAppointments.length, initialDataLoaded, view]);

  useEffect(() => {
    const root = rootRef.current;
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!root || !initialDataLoaded || !supportsHover) return undefined;

    const cards = [...root.querySelectorAll('.agenda-metric-card')];
    const cleanups = cards.map((card) => {
      let bounds;
      const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.32, ease: 'power3.out' });
      const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.32, ease: 'power3.out' });
      const lift = gsap.quickTo(card, 'y', { duration: 0.28, ease: 'power3.out' });

      const enter = () => {
        bounds = card.getBoundingClientRect();
        gsap.set(card, { transformPerspective: 850, transformOrigin: 'center' });
        lift(-5);
      };
      const move = (event) => {
        if (!bounds) return;
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        rotateX(y * -7);
        rotateY(x * 8);
      };
      const leave = () => {
        bounds = undefined;
        rotateX(0);
        rotateY(0);
        lift(0);
      };

      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      return () => {
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(cards);
      gsap.set(cards, { clearProps: 'transform,transformPerspective,transformOrigin' });
    };
  }, [initialDataLoaded]);

  useLayoutEffect(() => {
    if (!initialDataLoaded) return undefined;
    const counters = [...(rootRef.current?.querySelectorAll('[data-agenda-kpi]') || [])];
    const tweens = counters.map((element) => {
      const target = Number(element.dataset.agendaKpi) || 0;
      const counter = { value: 0 };
      const render = () => { element.textContent = Math.round(counter.value).toLocaleString('pt-BR'); };
      render();
      return gsap.to(counter, { value: target, duration: 1, delay: 0.5, ease: 'power3.out', onUpdate: render, onComplete: render });
    });
    return () => tweens.forEach((tween) => tween.kill());
  }, [aiAppointments.length, associatedContacts, currentMonthAppointments.length, initialDataLoaded, todayAppointments.length]);

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const days = eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }),
    });
    return (
      <div className="agenda-calendar-view agenda-month-view">
        <div className="agenda-week-labels">{WEEK_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="agenda-month-grid">
          {days.map((day) => {
            const dayAppointments = appointmentsForDay(day);
            const currentMonth = isSameMonth(day, monthStart);
            const today = isSameDay(day, new Date());
            return (
              <article key={day.toISOString()} className={`agenda-day-cell ${currentMonth ? '' : 'is-outside'} ${today ? 'is-today' : ''}`}>
                <button type="button" className="agenda-day-hit" onClick={() => openDayDetails(day)} aria-label={`Abrir agenda de ${format(day, "dd 'de' MMMM", { locale: ptBR })}`} />
                <header><span>{format(day, 'd')}</span>{dayAppointments.length > 0 && <small>{dayAppointments.length}</small>}</header>
                <div className="agenda-day-events">
                  {dayAppointments.slice(0, 3).map((appointment) => <AgendaEvent key={appointment.id} appointment={appointment} contacts={contacts} compact onEdit={openAppointmentEditor} />)}
                  {dayAppointments.length > 3 && <button type="button" className="agenda-more-events" onClick={() => openDayDetails(day)}>+{dayAppointments.length - 3} compromissos</button>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });
    return (
      <div className="agenda-calendar-view agenda-week-grid">
        {days.map((day) => {
          const dayAppointments = appointmentsForDay(day);
          return (
            <article key={day.toISOString()} className={`agenda-week-day ${isSameDay(day, new Date()) ? 'is-today' : ''}`}>
              <button type="button" className="agenda-week-heading" onClick={() => { setCurrentDate(day); setView('day'); }}>
                <small>{format(day, 'EEE', { locale: ptBR })}</small><strong>{format(day, 'dd')}</strong><span>{dayAppointments.length} {dayAppointments.length === 1 ? 'evento' : 'eventos'}</span>
              </button>
              <div>{dayAppointments.map((appointment) => <AgendaEvent key={appointment.id} appointment={appointment} contacts={contacts} onEdit={openAppointmentEditor} />)}</div>
              {dayAppointments.length === 0 && <button type="button" className="agenda-week-empty" onClick={() => openNewAppointment(day)}><Plus size={14} aria-hidden="true" /> Agendar</button>}
            </article>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppointments = appointmentsForDay(currentDate);
    return (
      <div className="agenda-calendar-view agenda-day-view">
        <header><span><small>{format(currentDate, 'EEEE', { locale: ptBR })}</small><strong>{format(currentDate, 'dd')}</strong></span><div><h3>{format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}</h3><p>{dayAppointments.length} {dayAppointments.length === 1 ? 'compromisso agendado' : 'compromissos agendados'}</p></div><button type="button" className="agenda-animated-action" onClick={() => openNewAppointment(currentDate)}><Plus size={15} aria-hidden="true" /> Novo horário</button></header>
        <div className="agenda-day-timeline">
          {dayAppointments.map((appointment) => (
            <div key={appointment.id} className="agenda-timeline-item">
              <time>{formatInTimeZone(appointment.start_time, TZ, 'HH:mm')}</time><i aria-hidden="true" /><AgendaEvent appointment={appointment} contacts={contacts} onEdit={openAppointmentEditor} />
            </div>
          ))}
          {dayAppointments.length === 0 && <div className="agenda-empty-state"><CalendarDays size={28} aria-hidden="true" /><strong>Dia livre</strong><p>Nenhum compromisso neste dia.</p><button type="button" className="agenda-animated-action" onClick={() => openNewAppointment(currentDate)}>Criar agendamento</button></div>}
        </div>
      </div>
    );
  };

  return (
    <div ref={rootRef} className={`content-wrapper agenda-page ${initialDataLoaded ? 'is-ready' : 'is-loading'}`} aria-busy={!initialDataLoaded}>
      <div className="agenda-cursor-glow" aria-hidden="true" />
      <div className="agenda-ambient-orbit agenda-ambient-orbit--one" aria-hidden="true" />
      <div className="agenda-ambient-orbit agenda-ambient-orbit--two" aria-hidden="true" />
      {!initialDataLoaded && <div className="agenda-loading-overlay" role="status" aria-live="polite"><span><CalendarDays size={20} aria-hidden="true" /></span><strong>Organizando sua agenda…</strong><small>Carregando compromissos e contatos.</small></div>}

      <header className="agenda-page-header">
        <div><span className="agenda-overline"><Sparkles size={13} aria-hidden="true" /> Rotina Comercial</span><h1>Agenda Inteligente</h1><p>Organize compromissos e mantenha cada contato no momento certo.</p></div>
        <button type="button" className="agenda-primary-action agenda-animated-action" onClick={() => openNewAppointment()}><Plus size={17} aria-hidden="true" /> Novo Agendamento</button>
      </header>

      <section className="agenda-metrics" aria-label="Resumo da agenda">
        <article className="agenda-metric-card is-blue"><span><small>Hoje</small><strong data-agenda-kpi={todayAppointments.length}>{todayAppointments.length}</strong><p>compromissos programados</p></span><i className="agenda-metric-icon"><Clock3 size={19} aria-hidden="true" /></i></article>
        <article className="agenda-metric-card is-mint"><span><small>Neste mês</small><strong data-agenda-kpi={currentMonthAppointments.length}>{currentMonthAppointments.length}</strong><p>agendamentos ativos</p></span><i className="agenda-metric-icon"><CalendarDays size={19} aria-hidden="true" /></i></article>
        <article className="agenda-metric-card is-lime"><span><small>Contatos associados</small><strong data-agenda-kpi={associatedContacts}>{associatedContacts}</strong><p>clientes com compromisso</p></span><i className="agenda-metric-icon"><UsersRound size={19} aria-hidden="true" /></i></article>
        <article className="agenda-metric-card is-cyan"><span><small>Criados pela IA</small><strong data-agenda-kpi={aiAppointments.length}>{aiAppointments.length}</strong><p>neste mês</p></span><i className="agenda-metric-icon"><Bot size={19} aria-hidden="true" /></i></article>
      </section>

      <section className="agenda-toolbar" aria-label="Navegação do calendário">
        <div className="agenda-period-navigation"><button type="button" className="agenda-today-button agenda-animated-action" onClick={() => setCurrentDate(new Date())}>Hoje</button><span className="agenda-arrow-group"><button type="button" className="agenda-animated-action" onClick={previous} aria-label="Período anterior"><ChevronLeft size={17} aria-hidden="true" /></button><button type="button" className="agenda-animated-action" onClick={next} aria-label="Próximo período"><ChevronRight size={17} aria-hidden="true" /></button></span><h2>{calendarTitle}</h2></div>
        <div className="agenda-view-switch" aria-label="Visualização da agenda">{[{ id: 'month', label: 'Mês' }, { id: 'week', label: 'Semana' }, { id: 'day', label: 'Dia' }].map((option) => <button key={option.id} type="button" className={`agenda-animated-action ${view === option.id ? 'is-active' : ''}`} onClick={() => setView(option.id)} aria-pressed={view === option.id}>{option.label}</button>)}</div>
      </section>

      <section className="agenda-workspace">
        <div className="agenda-calendar-shell">
          {view === 'month' ? renderMonthView() : view === 'week' ? renderWeekView() : renderDayView()}
        </div>
        <aside className="agenda-upcoming-card">
          <header><span><small>Próximos passos</small><strong>Em breve</strong></span><span>{upcomingAppointments.length}</span></header>
          <div className="agenda-upcoming-list">{upcomingAppointments.map((appointment) => <AgendaEvent key={appointment.id} appointment={appointment} contacts={contacts} onEdit={openAppointmentEditor} />)}{upcomingAppointments.length === 0 && <div className="agenda-upcoming-empty"><Check size={22} aria-hidden="true" /><strong>Agenda livre</strong><small>Nenhum compromisso futuro.</small></div>}</div>
          <button type="button" className="agenda-upcoming-add agenda-animated-action" onClick={() => openNewAppointment()}><Plus size={15} aria-hidden="true" /> Adicionar compromisso</button>
        </aside>
      </section>

      {isModalOpen && (
        <div className="agenda-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setIsModalOpen(false)}>
          <section ref={dialogRef} className="agenda-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-editor-title">
            <header><span className="agenda-modal-icon"><Edit3 size={18} aria-hidden="true" /></span><span><small>{formData.id ? 'Atualizar compromisso' : 'Novo compromisso'}</small><h2 id="agenda-editor-title">{formData.id ? 'Editar Agendamento' : 'Criar Agendamento'}</h2></span><button type="button" onClick={() => setIsModalOpen(false)} aria-label="Fechar formulário"><X size={18} aria-hidden="true" /></button></header>
            <form onSubmit={handleSaveAppointment}>
              <div className="agenda-modal-reveal agenda-contact-field">
                <label htmlFor="agenda-contact-search">Contato associado</label>
                {selectedContact && <div className="agenda-selected-contact"><span>{(selectedContact.name || 'C').substring(0, 2).toUpperCase()}</span><div><strong>{selectedContact.name || 'Sem nome'}</strong><small>{selectedContact.phone || 'Telefone não informado'}</small></div><button type="button" onClick={() => setFormData((current) => ({ ...current, contact_id: '' }))} aria-label="Remover contato selecionado"><X size={14} aria-hidden="true" /></button></div>}
                <div className="agenda-contact-search"><Search size={15} aria-hidden="true" /><input id="agenda-contact-search" name="contact_search" type="search" value={contactQuery} onChange={(event) => { setContactQuery(event.target.value); setContactPickerOpen(true); }} onFocus={() => setContactPickerOpen(true)} placeholder={selectedContact ? 'Trocar contato…' : 'Buscar por nome ou telefone…'} autoComplete="off" /></div>
                {contactPickerOpen && <div className="agenda-contact-results" role="listbox" aria-label="Contatos encontrados">{visibleContacts.map((contact) => <button key={contact.id} type="button" role="option" aria-selected={String(contact.id) === String(formData.contact_id)} onClick={() => { setFormData((current) => ({ ...current, contact_id: contact.id })); setContactQuery(''); setContactPickerOpen(false); }}><span>{(contact.name || 'C').substring(0, 2).toUpperCase()}</span><div><strong>{contact.name || 'Sem nome'}</strong><small>{contact.phone || 'Telefone não informado'}</small></div>{String(contact.id) === String(formData.contact_id) && <Check size={14} aria-hidden="true" />}</button>)}{visibleContacts.length === 0 && <p>Nenhum contato encontrado.</p>}</div>}
              </div>
              <div className="agenda-modal-reveal agenda-form-field"><label htmlFor="agenda-title">Título ou procedimento</label><input id="agenda-title" name="appointment_title" type="text" required value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Reunião de alinhamento…" autoComplete="off" /></div>
              <div className="agenda-modal-reveal agenda-form-row"><div className="agenda-form-field"><label htmlFor="agenda-date">Data</label><input id="agenda-date" name="appointment_date" type="date" required value={formData.date} onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))} /></div><div className="agenda-form-field"><label htmlFor="agenda-time">Horário de São Paulo</label><input id="agenda-time" name="appointment_time" type="time" required value={formData.start_time} onChange={(event) => setFormData((current) => ({ ...current, start_time: event.target.value }))} /></div></div>
              <div className="agenda-modal-reveal agenda-form-field"><label htmlFor="agenda-description"><AlignLeft size={13} aria-hidden="true" /> Observações</label><textarea id="agenda-description" name="appointment_description" rows="3" value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} placeholder="Adicione contexto para o atendimento…" /></div>
              {formError && <p className="agenda-form-error agenda-modal-reveal" role="alert">{formError}</p>}
              {confirmDelete && <div className="agenda-delete-confirm agenda-modal-reveal"><Trash2 size={15} aria-hidden="true" /><span><strong>Cancelar este agendamento?</strong><small>Ele sairá das visualizações da agenda.</small></span><button type="button" onClick={() => setConfirmDelete(false)}>Manter</button></div>}
              <footer className="agenda-modal-reveal">{formData.id ? <button type="button" className="agenda-delete-button" onClick={handleCancelAppointment} disabled={isSaving}><Trash2 size={14} aria-hidden="true" />{confirmDelete ? 'Confirmar exclusão' : 'Excluir'}</button> : <span />}<div><button type="button" className="agenda-secondary-button" onClick={() => setIsModalOpen(false)}>Cancelar</button><button type="submit" className="agenda-save-button" disabled={isSaving}>{isSaving ? 'Salvando…' : formData.id ? 'Salvar alterações' : 'Criar agendamento'}</button></div></footer>
            </form>
          </section>
        </div>
      )}

      {isDayModalOpen && selectedDayDate && (
        <div className="agenda-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setIsDayModalOpen(false)}>
          <section ref={dayDialogRef} className="agenda-modal agenda-day-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-day-title">
            <header><span className="agenda-modal-icon"><CalendarDays size={18} aria-hidden="true" /></span><span><small>{format(selectedDayDate, 'EEEE', { locale: ptBR })}</small><h2 id="agenda-day-title">{format(selectedDayDate, "dd 'de' MMMM", { locale: ptBR })}</h2></span><button type="button" onClick={() => setIsDayModalOpen(false)} aria-label="Fechar detalhes do dia"><X size={18} aria-hidden="true" /></button></header>
            <div className="agenda-day-modal-content">{appointmentsForDay(selectedDayDate).map((appointment) => <AgendaEvent key={appointment.id} appointment={appointment} contacts={contacts} onEdit={openAppointmentEditor} />)}{appointmentsForDay(selectedDayDate).length === 0 && <div className="agenda-empty-state"><CalendarDays size={26} aria-hidden="true" /><strong>Nenhum compromisso</strong><p>Este dia está livre para novos agendamentos.</p></div>}</div>
            <footer><button type="button" className="agenda-save-button agenda-animated-action" onClick={() => openNewAppointment(selectedDayDate)}><Plus size={15} aria-hidden="true" /> Novo Agendamento</button></footer>
          </section>
        </div>
      )}
    </div>
  );
}
