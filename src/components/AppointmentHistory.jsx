import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Calendar, History, FileText, CheckCircle2, Clock, XCircle, AlertTriangle, Receipt } from 'lucide-react';

const AppointmentHistory = ({ clinicId }) => {
    const [history, setHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                appointment_id,
                appointment_date,
                reason,
                status,
                profiles(user_name),
                invoices(total_amount, status)
            `)
            .eq('clinic_id', clinicId)
            .in('status', ['Completed', 'Cancelled', 'Missed'])
            .order('appointment_date', { ascending: false });

        if (!error) {
            setHistory(data || []);
            setFilteredHistory(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchHistory();
    }, [clinicId]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredHistory(history);
            return;
        }
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = history.filter(apt => {
            const clientName = apt.profiles?.user_name?.toLowerCase() || 'walk-in';
            const reason = apt.reason?.toLowerCase() || '';
            return clientName.includes(lowerQuery) || reason.includes(lowerQuery);
        });
        setFilteredHistory(filtered);
    }, [searchQuery, history]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white">Appointment History</h3>
                    <p className="text-sm text-slate-500 mt-1">Review past visits, cancellations, and associated billing.</p>
                </div>
            </div>

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search by patient name or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-md pl-11 pr-4 py-3 rounded-xl clinic-card border-white/10 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-100 shadow-sm transition-all"
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5/50">
                        <History className="w-16 h-16 text-slate-300 mb-4" />
                        <h4 className="text-lg font-bold text-slate-200">{searchQuery ? 'No matching records' : 'No history found'}</h4>
                        <p className="text-slate-500 mt-1 max-w-sm">No completed, cancelled, or missed appointments match your criteria.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredHistory.map((apt) => {
                            const invoice = apt.invoices && apt.invoices.length > 0 ? apt.invoices[0] : null;
                            const isCompleted = apt.status === 'Completed';
                            const isMissed = apt.status === 'Missed';

                            const statusStyle = isCompleted
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : isMissed
                                ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                                : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';

                            const StatusIcon = isCompleted ? CheckCircle2 : isMissed ? AlertTriangle : XCircle;

                            return (
                                <div key={apt.appointment_id} className={`group bg-white/5 p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isMissed ? 'border-orange-100' : 'border-white/10'}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${statusStyle}`}>
                                                <StatusIcon className="w-3.5 h-3.5"/>
                                                {apt.status}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-400">ID: {apt.appointment_id.substring(0, 8)}</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-1">{apt.profiles?.user_name || 'Walk-in Client'}</h4>
                                        <p className="text-sm text-slate-500 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400"/> {apt.reason}</p>
                                    </div>

                                    <div className="flex items-center gap-8 bg-white/5/5 p-4 rounded-xl border border-white/10 w-full md:w-auto">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Date</p>
                                            <p className="font-semibold text-slate-100">{new Date(apt.appointment_date).toLocaleDateString()}</p>
                                            <p className="text-xs text-slate-500">{new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>

                                        <div className="w-px h-12 bg-white/5/10 hidden sm:block"></div>

                                        <div className="flex flex-col gap-1 min-w-[100px]">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5"/> Billed</p>
                                            {invoice ? (
                                                <>
                                                    <p className="font-bold text-white leading-tight">EGP {Number(invoice.total_amount).toFixed(2)}</p>
                                                    <p className={`text-xs font-bold mt-0.5 ${invoice.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {invoice.status}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-semibold text-slate-300 leading-tight">—</p>
                                                    <p className="text-xs text-slate-400 mt-0.5 italic">No Invoice</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentHistory;