import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Receipt, CheckCircle, Clock, XCircle, Plus, Wallet, FileText, ChevronRight, CheckCircle2, UserCircle2, X, CreditCard, Banknote } from 'lucide-react';
import InvoicePreviewModal from './InvoicePreviewModal';
import { createClinicReceipt } from '../utils/receipts';

const defaultDueDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const Billing = ({ clinicId, clinicData }) => {
    const [invoices, setInvoices] = useState([]);
    const [knownClients, setKnownClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isWalkIn, setIsWalkIn] = useState(false);
    const [formData, setFormData] = useState({
        clientId: '',
        guestName: '',
        amount: '',
        dueDate: defaultDueDate()
    });

    // Mark-paid payment method modal
    const [payInvoice, setPayInvoice] = useState(null);
    const [payMethod, setPayMethod] = useState('Card');

    // Cancel confirmation modal
    const [cancelInvoice, setCancelInvoice] = useState(null);

    // PDF preview modal
    const [pendingInvoice, setPendingInvoice] = useState(null);

    const fetchBillingData = async () => {
        setIsLoading(true);

        const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
                invoice_id,
                total_amount,
                status,
                issue_date,
                due_date,
                guest_client_name,
                profiles!invoices_client_id_fkey(user_name)
            `)
            .eq('clinic_id', clinicId)
            .order('issue_date', { ascending: false });

        if (invoiceError) console.error("Error fetching invoices:", invoiceError);
        else setInvoices(invoiceData || []);

        const { data: clientData } = await supabase
            .from('appointments')
            .select(`profiles!appointments_user_id_fkey(user_id, user_name)`)
            .eq('clinic_id', clinicId);

        if (clientData) {
            const uniqueClients = [];
            const seen = new Set();
            clientData.forEach(apt => {
                if (apt.profiles && !seen.has(apt.profiles.user_id)) {
                    seen.add(apt.profiles.user_id);
                    uniqueClients.push(apt.profiles);
                }
            });
            setKnownClients(uniqueClients);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchBillingData();
    }, [clinicId]);

    const handleSaveInvoice = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const totalAmount = parseFloat(formData.amount);
        const payload = {
            clinic_id: clinicId,
            total_amount: totalAmount,
            status: 'Pending',
            due_date: new Date(formData.dueDate).toISOString()
        };

        const clientName = isWalkIn ? formData.guestName : (knownClients.find(c => c.user_id === formData.clientId)?.user_name || 'Client');
        if (isWalkIn) payload.guest_client_name = formData.guestName;
        else payload.client_id = formData.clientId;

        const { data: created, error } = await supabase.from('invoices').insert([payload]).select().single();

        if (error) {
            alert("Failed to generate invoice.");
        } else {
            setShowInvoiceModal(false);
            setFormData({ clientId: '', guestName: '', amount: '', dueDate: defaultDueDate() });
            fetchBillingData();

            if (totalAmount > 0 && created) {
                setPendingInvoice({
                    clinic: clinicData,
                    invoiceNumber: created.invoice_id.substring(0, 8).toUpperCase(),
                    issueDate: created.issue_date || new Date().toISOString(),
                    dueDate: created.due_date,
                    clientName,
                    paymentMethod: null,
                    paymentStatus: 'Pending',
                    procedures: [],
                    items: [],
                    total: totalAmount,
                });
            }
        }
        setIsSubmitting(false);
    };

    const handleMarkPaid = async () => {
        if (!payInvoice) return;
        const { error } = await supabase
            .from('invoices')
            .update({ status: 'Paid', payment_method: payMethod })
            .eq('invoice_id', payInvoice.invoice_id)
            .eq('clinic_id', clinicId);

        if (error) {
            alert('Failed to mark as paid.');
            return;
        }
        const total = Number(payInvoice.total_amount);
        const clientName = payInvoice.profiles?.user_name || payInvoice.guest_client_name || 'Walk-in Client';
        const paidInvoice = payInvoice;
        setPayInvoice(null);

        // Open the receipt modal IMMEDIATELY so the user is always prompted,
        // even if the receipt-save call below fails or stalls.
        if (total > 0) {
            setPendingInvoice({
                clinic: clinicData,
                invoiceNumber: paidInvoice.invoice_id.substring(0, 8).toUpperCase(),
                receiptNumber: null,
                issueDate: paidInvoice.issue_date,
                dueDate: paidInvoice.due_date,
                clientName,
                paymentMethod: payMethod,
                paymentStatus: 'Paid',
                procedures: [],
                items: [],
                total,
            });
        }

        // Auto-save a receipt in the background. If it succeeds, swap the
        // modal's receiptNumber in. Any failure is logged but never blocks UX.
        if (total > 0) {
            (async () => {
                try {
                    const { data: { user } = { user: null } } = await supabase.auth.getUser();
                    const receipt = await createClinicReceipt({
                        source: 'clinic_billing',
                        clinicId,
                        invoiceId: paidInvoice.invoice_id,
                        clientId: paidInvoice.profiles?.user_id || null,
                        guestClientName: paidInvoice.guest_client_name || null,
                        paymentMethod: payMethod,
                        paymentStatus: 'Paid',
                        subtotal: total,
                        discount: 0,
                        totalAmount: total,
                        itemsSnapshot: { currency: 'EGP', note: 'Manual invoice', total },
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

        fetchBillingData();
    };

    const handleCancelInvoice = async () => {
        if (!cancelInvoice) return;
        const { error } = await supabase
            .from('invoices')
            .update({ status: 'Cancelled' })
            .eq('invoice_id', cancelInvoice.invoice_id)
            .eq('clinic_id', clinicId);
        setCancelInvoice(null);
        if (!error) fetchBillingData();
    };

    const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalPending = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + Number(i.total_amount), 0);

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Billing & Invoices
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Manage payments, outstanding balances, and official records.</p>
                </div>
                <button onClick={() => setShowInvoiceModal(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-colors shrink-0">
                    <Plus className="w-5 h-5" />
                    Create Invoice
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 shrink-0">
                <div className="clinic-card border-white/10 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Wallet className="w-4 h-4"/> Total Collected</p>
                        <h4 className="text-3xl font-black text-white leading-none">EGP {totalCollected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h4>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-300">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                </div>
                <div className="clinic-card border-white/10 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4"/> Outstanding Balance</p>
                        <h4 className="text-3xl font-black text-amber-500 leading-none">EGP {totalPending.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h4>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Receipt className="w-7 h-7" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-8">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5/50">
                        <Receipt className="w-16 h-16 text-slate-300 mb-4" />
                        <h4 className="text-lg font-bold text-slate-200">No invoices found</h4>
                        <p className="text-slate-500 mt-1">Generate your first invoice to see it listed here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invoices.map(invoice => {
                            const isPaid = invoice.status === 'Paid';
                            const isCancelled = invoice.status === 'Cancelled';
                            const clientName = invoice.profiles?.user_name || invoice.guest_client_name || 'Walk-in Client';

                            return (
                                <div key={invoice.invoice_id} className={`group p-6 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isPaid ? 'bg-white/5/5 border-white/10 shadow-none' : 'bg-white/5 border-white/10 shadow-sm hover:shadow-md'}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-white/5/10 text-slate-500 flex items-center justify-center shrink-0">
                                                <UserCircle2 className="w-5 h-5"/>
                                            </div>
                                            <h4 className={`font-bold text-lg ${isPaid || isCancelled ? 'text-slate-300' : 'text-white'}`}>{clientName}</h4>
                                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1 ${
                                                isPaid ? 'bg-emerald-100 text-emerald-800' :
                                                isCancelled ? 'bg-white/5/10 text-slate-300' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {isPaid && <CheckCircle2 className="w-3 h-3" />}
                                                {isCancelled && <XCircle className="w-3 h-3" />}
                                                {!isPaid && !isCancelled && <Clock className="w-3 h-3" />}
                                                {invoice.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-xs font-semibold text-slate-500 gap-4 mt-2">
                                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> ID: {invoice.invoice_id.substring(0,8)}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>Issued: {new Date(invoice.issue_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className={!isPaid && !isCancelled ? 'text-amber-500 font-bold' : ''}>Due: {new Date(invoice.due_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/10 justify-between md:justify-end">
                                        <div className="text-left md:text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                                            <p className={`text-xl font-bold leading-none tabular-nums ${isPaid || isCancelled ? 'text-slate-400' : 'text-white'}`}>
                                                EGP {Number(invoice.total_amount).toFixed(2)}
                                            </p>
                                        </div>

                                        {!isPaid && !isCancelled && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setCancelInvoice(invoice)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Cancel Invoice">
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => { setPayInvoice(invoice); setPayMethod('Card'); }} className="bg-slate-900 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-1.5">
                                                    Mark Paid
                                                </button>
                                            </div>
                                        )}
                                        {isPaid && (
                                             <div className="flex items-center gap-2">
                                                <div className="text-emerald-500 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                             </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/5 p-8 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Create Invoice</h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-300 bg-white/5/10 hover:bg-white/5/10 p-1.5 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveInvoice} className="space-y-5">
                            <div className="flex bg-white/5/10 p-1.5 rounded-xl border border-white/10/50">
                                <button type="button" onClick={() => setIsWalkIn(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isWalkIn ? 'bg-white/5 shadow-sm border border-white/10 text-white' : 'text-slate-500 border border-transparent hover:text-slate-200'}`}>Registered Client</button>
                                <button type="button" onClick={() => setIsWalkIn(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isWalkIn ? 'bg-white/5 shadow-sm border border-white/10 text-white' : 'text-slate-500 border border-transparent hover:text-slate-200'}`}>Walk-in (Guest)</button>
                            </div>

                            {isWalkIn ? (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Guest Full Name</label>
                                    <input type="text" required value={formData.guestName} onChange={(e) => setFormData({...formData, guestName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" placeholder="e.g., Jane Doe" />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Select Client</label>
                                    <div className="relative">
                                        <select required value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} className="appearance-none w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer">
                                            <option value="" disabled>-- Select a Client --</option>
                                            {knownClients.map(client => (
                                                <option key={client.user_id} value={client.user_id}>{client.user_name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">▼</div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Total Amount (EGP)</label>
                                    <input type="number" step="0.01" min="0" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold" placeholder="0.00" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Due Date</label>
                                    <input type="date" required value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex gap-3">
                                <button type="button" onClick={() => setShowInvoiceModal(false)} className="flex-1 border border-white/10 text-slate-300 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Generate Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mark-Paid Payment Method Modal */}
            {payInvoice && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setPayInvoice(null)}>
                    <div className="bg-white/5 p-7 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-1">Confirm Payment</h3>
                        <p className="text-sm text-slate-500 mb-5">
                            Mark invoice for <span className="font-semibold text-slate-200">EGP {Number(payInvoice.total_amount).toFixed(2)}</span> as paid.
                        </p>
                        <div className="flex gap-2 mb-6 bg-white/5/10 p-1.5 rounded-xl border border-white/10/60">
                            <button
                                onClick={() => setPayMethod('Card')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${payMethod === 'Card' ? 'bg-white/5 shadow-sm text-white' : 'text-slate-500 hover:text-slate-200'}`}
                            >
                                <CreditCard className="w-4 h-4" /> Card
                            </button>
                            <button
                                onClick={() => setPayMethod('Cash')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${payMethod === 'Cash' ? 'bg-white/5 shadow-sm text-white' : 'text-slate-500 hover:text-slate-200'}`}
                            >
                                <Banknote className="w-4 h-4" /> Cash
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setPayInvoice(null)} className="flex-1 border border-white/10 text-slate-300 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={handleMarkPaid} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                                Collect {payMethod}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Invoice Confirmation */}
            {cancelInvoice && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setCancelInvoice(null)}>
                    <div className="bg-white/5 p-7 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-1">Cancel this invoice?</h3>
                        <p className="text-sm text-slate-500 text-center mb-5">
                            This will mark invoice for <span className="font-semibold text-slate-200">EGP {Number(cancelInvoice.total_amount).toFixed(2)}</span> as cancelled. This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelInvoice(null)} className="flex-1 border border-white/10 text-slate-300 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-colors">Keep Open</button>
                            <button onClick={handleCancelInvoice} className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 transition-colors">Cancel Invoice</button>
                        </div>
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

export default Billing;