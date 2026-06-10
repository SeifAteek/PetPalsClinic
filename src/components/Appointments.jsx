import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Check, X, Calendar as CalendarIcon, Clock, User, ChevronRight, CheckCircle2, FileText, Package, AlertCircle, Search, CreditCard, Banknote, Activity } from 'lucide-react';
import InvoicePreviewModal from './InvoicePreviewModal';
import { createClinicReceipt } from '../utils/receipts';

const Appointments = ({ clinicId, clinicData }) => {
    const [appointments, setAppointments] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [proceduresList, setProceduresList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Context Drawer State
    const [drawerMode, setDrawerMode] = useState('none'); // 'none', 'new', 'checkout'
    const [activeApt, setActiveApt] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Appt State
    const [formData, setFormData] = useState({ date: '', time: '', reason: '' });
    const [formErrors, setFormErrors] = useState({});

    // Checkout State
    const [usedItems, setUsedItems] = useState([]);
    const [usedProcedures, setUsedProcedures] = useState([]);
    const [paymentStatus, setPaymentStatus] = useState('Paid'); // 'Pending', 'Paid'
    const [paymentMethod, setPaymentMethod] = useState('Card'); // 'Card', 'Cash'
    const [invSearchQuery, setInvSearchQuery] = useState('');

    // Invoice preview state
    const [pendingInvoice, setPendingInvoice] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);

        // Mark as Missed only if scheduled time was more than 30 minutes ago
        // (gives walk-ins and slightly-late appointments breathing room)
        const graceCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        await supabase
            .from('appointments')
            .update({ status: 'Missed' })
            .eq('clinic_id', clinicId)
            .in('status', ['Pending', 'Confirmed'])
            .lt('appointment_date', graceCutoff);

        const { data: apts } = await supabase
            .from('appointments')
            .select(`appointment_id, appointment_date, reason, status, profiles(user_id, user_name)`)
            .eq('clinic_id', clinicId)
            .in('status', ['Pending', 'Confirmed'])
            .order('appointment_date', { ascending: true });
        setAppointments(apts || []);

        const { data: inv } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('clinic_id', clinicId)
            .gt('current_stock', 0);
        setInventory(inv || []);

        const { data: procs } = await supabase
            .from('clinic_procedures')
            .select('*')
            .eq('clinic_id', clinicId);
        setProceduresList(procs || []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchData();
    }, [clinicId]);

    const handleOpenNew = () => {
        setDrawerMode('new');
        setActiveApt(null);
        setFormErrors({});
        // Smart Defaults: Right Now
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);
        setFormData({ date: dateStr, time: timeStr, reason: '' });
    };

    const handleOpenCheckout = (apt) => {
        setActiveApt(apt);
        setUsedItems([]);
        setUsedProcedures([]);
        setPaymentStatus('Paid');
        setPaymentMethod('Card');
        setInvSearchQuery('');
        setDrawerMode('checkout');
    };

    const handleCloseDrawer = () => {
        setDrawerMode('none');
        setActiveApt(null);
    };

    const handleSaveAppointment = async (e) => {
        e.preventDefault();
        
        // Inline Validation
        const errors = {};
        if (!formData.time) errors.time = "Time is required";
        if (!formData.reason.trim()) errors.reason = "Please specify a patient or reason";
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        const appointmentDate = new Date(`${formData.date}T${formData.time}:00`).toISOString();
        const { error } = await supabase.from('appointments').insert([{ clinic_id: clinicId, appointment_date: appointmentDate, reason: formData.reason, status: 'Confirmed' }]);
        if (error) {
            alert('Failed to add appointment: ' + error.message);
            setIsSubmitting(false);
            return;
        }
        handleCloseDrawer();
        fetchData();
        setIsSubmitting(false);
    };

    const toggleProcedure = (procData) => {
        const exists = usedProcedures.find(p => p.procedure_id === procData.procedure_id);
        if (exists) setUsedProcedures(usedProcedures.filter(p => p.procedure_id !== procData.procedure_id));
        else setUsedProcedures([...usedProcedures, procData]);
    };

    const addItem = (itemData) => {
        const existing = usedItems.find(ui => ui.item.item_id === itemData.item_id);
        if (existing) {
            if (existing.qty + 1 > itemData.current_stock) return; // Silent fail visually, standard limits
            setUsedItems(usedItems.map(ui => ui.item.item_id === itemData.item_id ? { ...ui, qty: ui.qty + 1 } : ui));
        } else {
            setUsedItems([...usedItems, { item: itemData, qty: 1 }]);
        }
    };

    const removeItem = (itemId) => {
        const existing = usedItems.find(ui => ui.item.item_id === itemId);
        if (existing.qty > 1) {
            setUsedItems(usedItems.map(ui => ui.item.item_id === itemId ? { ...ui, qty: ui.qty - 1 } : ui));
        } else {
            setUsedItems(usedItems.filter(ui => ui.item.item_id !== itemId));
        }
    };

    const calculateTotal = () => {
        let total = 0;
        usedItems.forEach(ui => total += (Number(ui.item.unit_price) * ui.qty));
        usedProcedures.forEach(up => total += Number(up.price));
        return total;
    };

    const handleFinalizeVisit = async () => {
        setIsSubmitting(true);
        const finalTotal = calculateTotal();
        const apt = activeApt;
        const snapshotItems = [...usedItems];
        const snapshotProcedures = [...usedProcedures];
        const snapshotPaymentStatus = paymentStatus;
        const snapshotPaymentMethod = paymentStatus === 'Paid' ? paymentMethod : null;

        const { error: aptError } = await supabase.from('appointments')
            .update({ status: 'Completed' })
            .eq('appointment_id', apt.appointment_id)
            .eq('clinic_id', clinicId);
        if (aptError) {
            alert('Failed to complete appointment: ' + aptError.message);
            setIsSubmitting(false);
            return;
        }

        for (const entry of snapshotItems) {
            await supabase.from('appointment_usage').insert([{ appointment_id: apt.appointment_id, item_id: entry.item.item_id, quantity_used: entry.qty }]);
            const newStock = Math.max(entry.item.current_stock - entry.qty, 0);
            await supabase.from('inventory_items')
                .update({ current_stock: newStock })
                .eq('item_id', entry.item.item_id)
                .eq('clinic_id', clinicId);
        }

        let invoiceId = null;
        if (finalTotal > 0) {
            const isWalkIn = !apt.profiles;
            const invoicePayload = {
                clinic_id: clinicId,
                appointment_id: apt.appointment_id,
                total_amount: finalTotal,
                status: snapshotPaymentStatus,
                payment_method: snapshotPaymentMethod,
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
            if (isWalkIn) invoicePayload.guest_client_name = "Walk-in Client";
            else invoicePayload.client_id = apt.profiles.user_id;

            const { data: created } = await supabase.from('invoices').insert([invoicePayload]).select().single();
            if (created) invoiceId = created.invoice_id;
        }

        // Open the preview modal IMMEDIATELY so the user is always prompted,
        // even if the receipt-save call below fails or stalls.
        if (finalTotal > 0) {
            setPendingInvoice({
                clinic: clinicData,
                invoiceNumber: invoiceId ? invoiceId.substring(0, 8).toUpperCase() : `WALKIN-${Date.now().toString(36).toUpperCase()}`,
                receiptNumber: null,
                issueDate: new Date().toISOString(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                clientName: apt.profiles?.user_name || 'Walk-in Client',
                paymentMethod: snapshotPaymentMethod,
                paymentStatus: snapshotPaymentStatus,
                procedures: snapshotProcedures,
                items: snapshotItems,
                total: finalTotal,
            });
        }

        // If the visit was paid in full, save a receipt to the DB in the
        // background. Any failure is logged but never blocks UX.
        if (finalTotal > 0 && snapshotPaymentStatus === 'Paid') {
            (async () => {
                try {
                    const { data: { user } = { user: null } } = await supabase.auth.getUser();
                    const itemsSnapshot = {
                        procedures: snapshotProcedures.map(p => ({ name: p.name, price: Number(p.price) })),
                        items: snapshotItems.map(ui => ({
                            item_id: ui.item.item_id,
                            name: ui.item.item_name,
                            category: ui.item.category || 'Item',
                            quantity: ui.qty,
                            unit_price: Number(ui.item.unit_price),
                            sub_total: Number(ui.item.unit_price) * ui.qty,
                        })),
                        currency: 'EGP',
                        total: finalTotal,
                    };
                    const receipt = await createClinicReceipt({
                        source: 'clinic_appointment',
                        clinicId,
                        invoiceId,
                        appointmentId: apt.appointment_id,
                        clientId: apt.profiles?.user_id || null,
                        guestClientName: apt.profiles ? null : 'Walk-in Client',
                        paymentMethod: snapshotPaymentMethod,
                        paymentStatus: 'Paid',
                        subtotal: finalTotal,
                        discount: 0,
                        totalAmount: finalTotal,
                        itemsSnapshot,
                        issuedBy: user?.id || null,
                    });
                    if (receipt?.receipt_number) {
                        setPendingInvoice(prev => prev ? { ...prev, receiptNumber: receipt.receipt_number } : prev);
                    }
                } catch (err) {
                    console.error('Receipt save failed (non-blocking):', err);
                }
            })();
        }

        handleCloseDrawer();
        fetchData();
        setIsSubmitting(false);
    };

    const filteredInventory = inventory.filter(inv => inv.item_name.toLowerCase().includes(invSearchQuery.toLowerCase()));

    return (
        <div className="flex h-full overflow-hidden gap-8 pt-2">
            {/* Left Panel: Active Queue */}
            <div className={`flex flex-col h-full transition-all duration-300 ${drawerMode !== 'none' ? 'w-[55%] pr-4' : 'w-full'}`}>
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white">Active Queue</h3>
                        <p className="text-sm text-slate-500 mt-1">Manage today's patient flow</p>
                    </div>
                    {drawerMode === 'none' && (
                        <button onClick={handleOpenNew} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-sm">
                            <Plus className="w-4 h-4" />
                            Walk-in Patient
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 shadow-sm">
                        <CalendarIcon className="w-16 h-16 text-slate-200 mb-4" />
                        <h4 className="font-bold text-slate-200 text-lg">Lobby is clearly empty</h4>
                        <p className="text-slate-500 mt-1">No patients are currently waiting.</p>
                        <button onClick={handleOpenNew} className="mt-6 border border-white/10 text-slate-200 font-semibold text-sm hover:bg-white/10 py-2 px-4 rounded-xl shadow-sm transition-colors">Register Walk-in</button>
                    </div>
                ) : (
                    <div className="space-y-4 overflow-y-auto pr-2 pb-4">
                        {appointments.map((apt) => {
                            const isSelected = activeApt?.appointment_id === apt.appointment_id;
                            const tTime = new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            
                            // UX: Semantic Visual Tracking Badges
                            const isConfirmed = apt.status === 'Confirmed';

                            return (
                                <div 
                                    key={apt.appointment_id} 
                                    onClick={() => handleOpenCheckout(apt)}
                                    className={`group cursor-pointer p-4 xl:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                                        isSelected 
                                            ? 'bg-brand-500/10 border-brand-300 shadow-md ring-2 ring-brand-500/30' 
                                            : 'bg-white/5 border-white/10 hover:border-brand-500/30 hover:shadow-md hover:-translate-y-0.5'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 ${isSelected ? 'bg-white/5 border-brand-400 text-brand-400' : 'bg-white/5/5 border-white/10 text-slate-400 group-hover:text-brand-500 group-hover:border-brand-100 transition-colors'}`}>
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`text-lg font-bold leading-tight mb-1 ${isSelected ? 'text-brand-900' : 'text-white'}`}>{apt.profiles?.user_name || 'Walk-in Client'}</h4>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-white/5/10 px-2 py-0.5 rounded-lg border border-white/10"><Clock className="w-3.5 h-3.5 text-slate-400" /> {tTime}</span>
                                                <span className="text-sm font-medium text-slate-500 truncate max-w-[200px]">{apt.reason}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                                        {/* Colored Status Badge */}
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${isConfirmed ? 'bg-amber-500/100/10 text-amber-300 border-amber-200' : 'bg-white/5/10 text-slate-300 border-white/10'}`}>
                                            {isConfirmed ? <><Clock className="w-3.5 h-3.5"/> Waiting Room</> : <><Activity className="w-3.5 h-3.5"/> Action Req.</>}
                                        </div>
                                        <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-400 group-hover:translate-x-1'}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Right Panel: Context Drawer */}
            {drawerMode !== 'none' && (
                <div className="flex-1 clinic-card border-white/10 rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-right-8 duration-300 z-10 relative">
                    <div className="px-6 py-5 flex justify-between items-center border-b border-white/10 bg-white/5/5 rounded-t-2xl shrink-0">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {drawerMode === 'new' ? <><Plus className="w-5 h-5 text-brand-400" /> Register Patient</> : <><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Checkout & Services</>}
                        </h3>
                        <button onClick={handleCloseDrawer} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-white/5/10 hover:text-slate-100 transition-colors clinic-card border-white/10 shadow-sm"><X className="w-5 h-5"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* MODE: NEW APPOINTMENT */}
                        {drawerMode === 'new' && (
                            <form id="new-apt-form" onSubmit={handleSaveAppointment} className="space-y-6">
                                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-100 mb-2 flex items-start gap-3 shadow-sm rounded-br-none">
                                    <div className="bg-emerald-600 rounded-full p-1 text-white shrink-0 mt-0.5"><Check className="w-3 h-3"/></div>
                                    <p><strong>Fast Walk-in Mode:</strong> The time has been automatically set to <strong>Right Now</strong>. Just add the name and drop them into the queue.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Visit Date</label>
                                        <div className="relative">
                                            <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5/5 focus:bg-white/5 text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors font-medium cursor-pointer" />
                                            <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${formErrors.time ? 'text-rose-500' : 'text-slate-500'}`}>Arrival Time</label>
                                        <div className="relative">
                                            <input type="time" required value={formData.time} onChange={(e) => {setFormData({...formData, time: e.target.value}); setFormErrors({...formErrors, time: null});}} className={`w-full pl-10 pr-4 py-3 rounded-xl border ${formErrors.time ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20' : 'border-white/10 bg-white/5/5 focus:bg-white/5 focus:border-brand-500 focus:ring-brand-500/20'} text-slate-100 outline-none focus:ring-2 transition-colors font-medium cursor-pointer`} />
                                            <Clock className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${formErrors.time ? 'text-rose-400' : 'text-slate-400'}`} />
                                        </div>
                                        {formErrors.time && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {formErrors.time}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${formErrors.reason ? 'text-rose-500' : 'text-slate-500'}`}>Patient Name & Symptoms</label>
                                    <textarea rows="4" value={formData.reason} onChange={(e) => {setFormData({...formData, reason: e.target.value}); setFormErrors({...formErrors, reason: null});}} placeholder="e.g. Leo (Golden Retriever) - Limping on right leg" className={`w-full px-4 py-3 rounded-xl border ${formErrors.reason ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20' : 'border-white/10 bg-white/5/5 focus:bg-white/5 focus:border-brand-500 focus:ring-brand-500/20'} text-slate-100 outline-none focus:ring-2 transition-colors resize-none`}></textarea>
                                    {formErrors.reason && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {formErrors.reason}</p>}
                                </div>
                            </form>
                        )}

                        {/* MODE: CHECKOUT */}
                        {drawerMode === 'checkout' && activeApt && (
                            <div className="space-y-8 animate-in fade-in">
                                {/* Header Info */}
                                <div className="bg-white/5/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
                                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-200/50 to-transparent pointer-events-none"></div>
                                    <h4 className="text-2xl font-black text-white relative z-10">{activeApt.profiles?.user_name || 'Guest / Walk-in Client'}</h4>
                                    <p className="text-slate-300 text-sm mt-1.5 font-medium relative z-10 line-clamp-2">{activeApt.reason}</p>
                                </div>

                                {/* Quick Add Procedures */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                                        <span><FileText className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/> Clinical Services Rendered</span>
                                        <span className="text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-100">{usedProcedures.length} Selected</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {proceduresList.map(proc => {
                                            const isActive = usedProcedures.find(p => p.procedure_id === proc.procedure_id);
                                            return (
                                                <button 
                                                    key={proc.procedure_id} 
                                                    onClick={() => toggleProcedure(proc)}
                                                    title={`EGP ${proc.price}`}
                                                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${
                                                        isActive 
                                                        ? 'bg-slate-800 border-slate-800 text-white shadow-md -translate-y-0.5' 
                                                        : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:shadow-sm'
                                                    }`}
                                                >
                                                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-600" />} {proc.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-white/10 my-4 pl-4"></div>

                                {/* Quick Add Inventory with Search */}
                                <div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Package className="w-3.5 h-3.5 -mt-0.5"/> Dispense Inventory
                                        </label>
                                        <div className="relative w-full sm:w-48">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="text" 
                                                placeholder="Search stock..." 
                                                value={invSearchQuery}
                                                onChange={(e) => setInvSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-white/5/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {filteredInventory.length === 0 ? (
                                        <div className="text-center py-6 text-sm text-slate-400 font-medium bg-white/5/5 rounded-xl border border-dashed border-white/10">
                                            No items matching "{invSearchQuery}"
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 -m-1">
                                            {filteredInventory.map(inv => {
                                                const usage = usedItems.find(ui => ui.item.item_id === inv.item_id);
                                                return (
                                                    <div key={inv.item_id} className={`relative group p-3 rounded-xl border transition-all ${usage ? 'bg-brand-500/10/30 border-brand-500/30 shadow-sm' : 'bg-white/5 border-white/10 hover:border-brand-500/30 hover:shadow-md hover:-translate-y-0.5'} flex flex-col justify-between`}>
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-100 line-clamp-1 block leading-tight mb-0.5">{inv.item_name}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Stock: {inv.current_stock}</span>
                                                        </div>
                                                        
                                                        {usage ? (
                                                            <div className="mt-3 flex items-center justify-between bg-white/5 rounded-lg p-1 border border-brand-100 shadow-sm">
                                                                <button onClick={() => removeItem(inv.item_id)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5/10 text-slate-300 transition-colors font-bold text-lg">-</button>
                                                                <span className="text-sm font-black text-brand-300">{usage.qty}</span>
                                                                <button onClick={() => addItem(inv)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5/10 text-brand-400 transition-colors font-bold text-lg">+</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => addItem(inv)} className="mt-3 text-xs font-bold px-2 py-2 bg-white/5/5 text-slate-300 border border-white/10 rounded-lg group-hover:bg-brand-500/10 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors w-full text-center">
                                                                Add Item
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Drawer Footer Actions */}
                    <div className="p-6 border-t border-white/10 bg-white/5 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] rounded-b-2xl shrink-0 z-20">
                        {drawerMode === 'new' && (
                            <button form="new-apt-form" type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition-all disabled:opacity-50 text-base">
                                {isSubmitting ? 'Adding...' : 'Verify & Add to Queue'}
                            </button>
                        )}

                        {drawerMode === 'checkout' && (
                            <div>
                                <div className="flex justify-between items-center mb-5 bg-white/5/5 p-4 rounded-xl border border-white/10">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Invoice</span>
                                    <span className="text-3xl font-black text-white tracking-tight">EGP {calculateTotal().toFixed(2)}</span>
                                </div>
                                
                                {calculateTotal() > 0 && paymentStatus === 'Paid' && (
                                     <div className="flex gap-2 mb-3 bg-white/5/10 p-1.5 rounded-xl border border-white/10/60 transition-all">
                                        <button 
                                            onClick={() => setPaymentMethod('Card')} 
                                            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Card' ? 'bg-white/5 shadow-sm text-white' : 'text-slate-500 hover:text-slate-200'}`}
                                        >
                                            <CreditCard className="w-4 h-4"/> Card
                                        </button>
                                        <button 
                                            onClick={() => setPaymentMethod('Cash')} 
                                            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Cash' ? 'bg-white/5 shadow-sm text-white' : 'text-slate-500 hover:text-slate-200'}`}
                                        >
                                            <Banknote className="w-4 h-4"/> Cash
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setPaymentStatus(paymentStatus === 'Pending' ? 'Paid' : 'Pending')} 
                                        className={`px-4 py-3.5 rounded-xl font-bold text-sm border-2 transition-all ${paymentStatus === 'Pending' ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-inner' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                                    >
                                        Bill Later
                                    </button>
                                    <button 
                                        onClick={handleFinalizeVisit} 
                                        disabled={isSubmitting} 
                                        className={`flex-1 py-3.5 rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 text-base ${
                                            paymentStatus === 'Pending' 
                                            ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                                        } disabled:opacity-50`}
                                    >
                                        {isSubmitting ? 'Processing...' : (
                                            paymentStatus === 'Pending' 
                                            ? <><Check className="w-5 h-5"/> Complete Visit</>
                                            : <><CheckCircle2 className="w-5 h-5"/> Collect {paymentMethod} & Close</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {pendingInvoice && (
                <InvoicePreviewModal
                    invoiceData={pendingInvoice}
                    onClose={() => setPendingInvoice(null)}
                />
            )}
        </div>
    );
};

export default Appointments;