import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../supabaseClient';
import { X, User, Clock, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const CalendarView = ({ clinicId }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const fetchAppointmentsForCalendar = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                appointment_id,
                appointment_date,
                reason,
                status,
                profiles(user_name)
            `)
            .eq('clinic_id', clinicId)
            .neq('status', 'Cancelled');

        if (!error) {
            const statusPalette = {
                confirmed: '#0d9488',
                pending: '#6366f1',
                completed: '#10b981',
                missed: '#f97316',
                cancelled: '#94a3b8',
            };
            const normalizeStatus = (raw) => {
                const s = (raw ?? 'pending').toString().trim().toLowerCase();
                return Object.prototype.hasOwnProperty.call(statusPalette, s) ? s : 'pending';
            };
            const calendarEvents = (data || []).map(apt => {
                const norm = normalizeStatus(apt.status);
                const bg = statusPalette[norm] || '#6366f1';
                const fcClass = `pp-appt-status-${norm}`;
                return {
                    id: apt.appointment_id,
                    title: `${apt.profiles?.user_name || 'Walk-in'}: ${apt.reason || '—'}`,
                    start: apt.appointment_date,
                    end: new Date(new Date(apt.appointment_date).getTime() + 45 * 60000).toISOString(),
                    backgroundColor: bg,
                    borderColor: bg,
                    textColor: '#ffffff',
                    classNames: [fcClass],
                    extendedProps: {
                        status: apt.status || 'Pending',
                        normStatus: norm,
                        client: apt.profiles?.user_name || 'Walk-in',
                        reason: apt.reason,
                        time: apt.appointment_date,
                    }
                };
            });
            setEvents(calendarEvents);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchAppointmentsForCalendar();
    }, [clinicId]);

    const handleEventClick = (info) => {
        setSelectedEvent({
            client: info.event.extendedProps.client,
            reason: info.event.extendedProps.reason,
            status: info.event.extendedProps.status,
            time: info.event.extendedProps.time,
        });
    };

    const getStatusStyle = (status) => {
        if (status === 'Completed') return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
        if (status === 'Missed') return { icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
        if (status === 'Cancelled') return { icon: XCircle, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' };
        if (status === 'Pending') return { icon: Clock, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' };
        return { icon: Clock, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' };
    };

    const STATUS_HEX = {
        confirmed: '#0d9488',
        pending: '#6366f1',
        completed: '#10b981',
        missed: '#f97316',
        cancelled: '#94a3b8',
    };

    /** FullCalendar strips inline colors in some views — force DOM styles on mount/update */
    const paintEventColors = (info) => {
        const norm = info.event.extendedProps.normStatus || 'pending';
        const bg = STATUS_HEX[norm] || STATUS_HEX.pending;
        const root = info.el;
        if (!root) return;
        root.style.setProperty('background-color', bg, 'important');
        root.style.setProperty('border-color', bg, 'important');
        root.style.setProperty('color', '#ffffff', 'important');
        root.querySelectorAll('.fc-event-main, .fc-event-main-frame, .fc-event-title, .fc-event-time').forEach((node) => {
            node.style.setProperty('color', '#ffffff', 'important');
            node.style.setProperty('background-color', 'transparent', 'important');
        });
    };

    const handleEventDidMount = (info) => {
        paintEventColors(info);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 24px 0', boxSizing: 'border-box' }}>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Visual Schedule
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Calendar overview of daily and weekly bookings.</p>
                </div>
                <div className="hidden md:flex items-center gap-3 text-xs font-semibold">
                    {[['Confirmed','bg-teal-500'],['Pending','bg-indigo-500'],['Completed','bg-emerald-500'],['Missed','bg-orange-500'],['Cancelled','bg-slate-400']].map(([label, color]) => (
                        <span key={label} className="flex items-center gap-1.5 text-slate-300">
                            <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>{label}
                        </span>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '16px 16px 0 0', border: '1px solid #F3F4F6', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : (
                    <div style={{ flex: 1, overflow: 'hidden' }} className="custom-calendar">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            events={events}
                            eventClick={handleEventClick}
                            height="100%"
                            slotMinTime="08:00:00"
                            slotMaxTime="22:00:00"
                            allDaySlot={false}
                            nowIndicator={true}
                            eventDisplay="block"
                            displayEventTime={true}
                            eventTimeFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                meridiem: false
                            }}
                            eventDidMount={handleEventDidMount}
                        />
                    </div>
                )}
            </div>

            {selectedEvent && (() => {
                const { icon: StatusIcon, color, bg, border } = getStatusStyle(selectedEvent.status);
                return (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
                        <div className="bg-white/5 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
                                <h3 className="font-bold text-white text-lg">Appointment Detail</h3>
                                <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5/10 hover:text-slate-300 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5/10 flex items-center justify-center"><User className="w-5 h-5 text-slate-500" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client</p>
                                        <p className="font-bold text-white">{selectedEvent.client}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5/10 flex items-center justify-center"><Clock className="w-5 h-5 text-slate-500" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</p>
                                        <p className="font-semibold text-slate-100">{new Date(selectedEvent.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5/10 flex items-center justify-center"><FileText className="w-5 h-5 text-slate-500" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</p>
                                        <p className="font-semibold text-slate-100">{selectedEvent.reason || '—'}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${bg} ${border}`}>
                                    <StatusIcon className={`w-4 h-4 ${color}`} />
                                    <span className={`text-sm font-bold ${color}`}>{selectedEvent.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <style>
                {`
                .custom-calendar {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    --fc-border-color: #F3F4F6;
                    --fc-button-bg-color: #5EC4F0;
                    --fc-button-border-color: #5EC4F0;
                    --fc-button-hover-bg-color: #3aafde;
                    --fc-button-hover-border-color: #3aafde;
                    --fc-button-active-bg-color: #1A1A2E;
                    --fc-button-active-border-color: #1A1A2E;
                    --fc-today-bg-color: #EFF9FE;
                    --fc-page-bg-color: #ffffff;
                    --fc-neutral-bg-color: #F9FAFB;
                    --fc-event-text-color: #ffffff;
                }
                .custom-calendar .fc {
                    height: 100%;
                    font-family: inherit;
                }
                .fc-theme-standard th, .fc-theme-standard td, .fc-theme-standard .fc-scrollgrid {
                    border-color: #F3F4F6;
                }
                .fc .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; color: #1A1A2E; }
                .fc .fc-button {
                    text-transform: capitalize;
                    font-weight: 600;
                    border-radius: 8px;
                    padding: 6px 14px;
                    font-size: 13px;
                    box-shadow: none !important;
                }
                .fc .fc-button:focus { outline: 2px solid #5EC4F0; outline-offset: 2px; }
                .fc .fc-button-primary:not(:disabled).fc-button-active,
                .fc .fc-button-primary:not(:disabled):active {
                    background-color: #1A1A2E;
                    border-color: #1A1A2E;
                }
                .fc-event {
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    border: none !important;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
                    margin-bottom: 3px;
                }
                .fc-daygrid-day-frame {
                    padding: 4px;
                }
                .fc-daygrid-block-event .fc-event-main,
                .fc-timegrid-event .fc-event-main { color: #fff !important; }
                .fc-daygrid-event { border: none !important; }
                .fc-h-event { border: none !important; }
                .fc-v-event { border-left: 4px solid rgba(0,0,0,0.15) !important; }
                .pp-appt-status-confirmed  { background-color: #0d9488 !important; }
                .pp-appt-status-pending    { background-color: #6366f1 !important; }
                .pp-appt-status-completed  { background-color: #10b981 !important; }
                .pp-appt-status-missed     { background-color: #f97316 !important; }
                .pp-appt-status-cancelled  { background-color: #94a3b8 !important; }
                .fc-timegrid-slot { height: 3rem !important; }
                .fc-col-header-cell { background: #F9FAFB; font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; }
                .fc-daygrid-day-number { color: #374151; font-size: 13px; font-weight: 600; }
                .fc-day-today .fc-daygrid-day-number { color: #5EC4F0; font-weight: 800; }
                `}
            </style>
        </div>
    );
};

export default CalendarView;