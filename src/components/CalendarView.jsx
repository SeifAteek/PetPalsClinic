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
        if (status === 'Completed') return { icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-50', border: 'border-emerald-500/20' };
        if (status === 'Missed') return { icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
        if (status === 'Cancelled') return { icon: XCircle, color: 'text-slate-300', bg: 'bg-white/5/10', border: 'border-white/10' };
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
        <div className="flex flex-col h-full">
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

            <div className="flex-1 bg-white/5 p-6 rounded-2xl shadow-sm border border-white/10 overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : (
                    <div className="h-full custom-calendar overflow-y-auto">
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
                    --fc-border-color: #f1f5f9;
                    --fc-button-bg-color: #0f172a;
                    --fc-button-border-color: #0f172a;
                    --fc-button-hover-bg-color: #334155;
                    --fc-button-hover-border-color: #334155;
                    --fc-button-active-bg-color: #14b8a6;
                    --fc-button-active-border-color: #14b8a6;
                    --fc-today-bg-color: #f8fafc;
                }
                .fc-theme-standard th, .fc-theme-standard td, .fc-theme-standard .fc-scrollgrid {
                    border-color: #f1f5f9;
                }
                .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; font-family: "Plus Jakarta Sans", sans-serif; }
                .fc .fc-button { text-transform: capitalize; font-weight: 600; font-family: "Plus Jakarta Sans", sans-serif; border-radius: 0.5rem; padding: 0.5rem 1rem; }
                .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active {
                    background-color: var(--fc-button-active-bg-color);
                    border-color: var(--fc-button-active-border-color);
                }
                .fc-event { cursor: pointer; padding: 2px 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; border: none !important; box-shadow: 0 1px 2px rgba(0,0,0,0.12); }
                .fc-daygrid-block-event .fc-event-main,
                .fc-timegrid-event .fc-event-main { color: #fff !important; }
                .fc-daygrid-event { border: none !important; }
                .fc-h-event { border: none !important; }
                .fc-v-event { border-left: 4px solid rgba(0,0,0,0.15) !important; }
                .pp-appt-status-confirmed { background-color: #0d9488 !important; }
                .pp-appt-status-pending { background-color: #6366f1 !important; }
                .pp-appt-status-completed { background-color: #10b981 !important; }
                .pp-appt-status-missed { background-color: #f97316 !important; }
                .pp-appt-status-cancelled { background-color: #94a3b8 !important; }
                .fc-timegrid-slot { height: 3rem !important; }
                `}
            </style>
        </div>
    );
};

export default CalendarView;