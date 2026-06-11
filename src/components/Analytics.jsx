import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TrendingUp, TrendingDown, DollarSign, Plus, Package, X, Activity, CheckCircle2 } from 'lucide-react';

const Analytics = ({ clinicId }) => {
    const [metrics, setMetrics] = useState({ income: 0, expenses: 0, net: 0 });
    const [expensesList, setExpensesList] = useState([]);
    const [inventory, setInventory] = useState([]);

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        category: 'Inventory Restock',
        description: '',
        amount: '',
        restockItemId: '',
        restockQty: 1
    });

    const fetchAnalyticsData = async () => {
        setIsLoading(true);

        const { data: incomeData } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('clinic_id', clinicId)
            .eq('status', 'Paid');

        const totalIncome = incomeData ? incomeData.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0) : 0;

        const { data: expenseData } = await supabase
            .from('clinic_expenses')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('expense_date', { ascending: false });

        const totalExpenses = expenseData ? expenseData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : 0;

        const { data: invData } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('item_name', { ascending: true });

        setInventory(invData || []);
        setMetrics({ income: totalIncome, expenses: totalExpenses, net: totalIncome - totalExpenses });
        setExpensesList(expenseData || []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchAnalyticsData();
    }, [clinicId]);

    const handleLogExpense = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        let finalDescription = formData.description;

        try {
            if (formData.category === 'Inventory Restock') {
                if (!formData.restockItemId) throw new Error("Please select an inventory item to restock.");
                if (formData.restockQty <= 0) throw new Error("Quantity must be greater than zero.");

                const selectedItem = inventory.find(i => i.item_id === formData.restockItemId);
                if (!selectedItem) throw new Error("Item not found in inventory.");

                finalDescription = `Restocked ${formData.restockQty}x ${selectedItem.item_name}`;

                const newStock = selectedItem.current_stock + parseInt(formData.restockQty);
                const { error: stockError } = await supabase
                    .from('inventory_items')
                    .update({ current_stock: newStock, last_restocked: new Date().toISOString() })
                    .eq('item_id', formData.restockItemId)
                    .eq('clinic_id', clinicId);

                if (stockError) throw new Error("Database Error: Could not update inventory stock.");
            } else {
                if (!finalDescription.trim()) throw new Error("Please provide a description for this expense.");
            }

            const { error: expenseError } = await supabase.from('clinic_expenses').insert([{
                clinic_id: clinicId,
                category: formData.category,
                description: finalDescription,
                amount: parseFloat(formData.amount)
            }]);

            if (expenseError) throw new Error("Database Error: Could not log the expense.");

            setShowExpenseModal(false);
            setFormData({ category: 'Inventory Restock', description: '', amount: '', restockItemId: '', restockQty: 1 });
            fetchAnalyticsData();

        } catch (err) {
            console.error("Expense Error:", err);
            alert(err.message || "An unexpected error occurred while saving.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Financial Analytics
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Track net revenue, income, and manage operating expenses.</p>
                </div>
                <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-colors shrink-0">
                    <Plus className="w-5 h-5" />
                    Log Expense
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
                <div className="clinic-card border-white/10 shadow-sm p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">Gross Income</p>
                        <h4 className="text-3xl font-black text-white leading-none">EGP {(Number(metrics.income) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
                <div className="clinic-card border-white/10 shadow-sm p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">Total Expenses</p>
                        <h4 className="text-3xl font-black text-rose-500 leading-none">EGP {(Number(metrics.expenses) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                </div>
                <div className={`border shadow-sm p-6 rounded-2xl flex items-center justify-between ${metrics.net >= 0 ? 'bg-brand-500/10 border-brand-100' : 'bg-rose-50 border-rose-200'}`}>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${metrics.net >= 0 ? 'text-[color:var(--pp-primary)]' : 'text-rose-600'}`}>Net Revenue</p>
                        <h4 className={`text-3xl font-black leading-none ${metrics.net >= 0 ? 'text-[color:var(--pp-primary)]' : 'text-rose-700'}`}>
                            EGP {(Math.abs(Number(metrics.net)) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            {metrics.net < 0 && <span className="text-lg ml-1">(Loss)</span>}
                        </h4>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${metrics.net >= 0 ? 'bg-[var(--pp-primary)]/20 text-[color:var(--pp-primary)]' : 'bg-rose-100 text-rose-600'}`}>
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Expense History Log */}
            <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-500"/> Expense History</h4>
            <div className="flex-1 overflow-y-auto pr-2 pb-8">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : expensesList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5/50">
                        <TrendingDown className="w-16 h-16 text-slate-300 mb-4" />
                        <h4 className="text-lg font-bold text-slate-200">No expenses logged</h4>
                        <p className="text-slate-500 mt-1">Keep track of your operating costs by logging an expense.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expensesList.map(exp => (
                            <div key={exp.expense_id} className="p-5 clinic-card border-white/10 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold bg-white/5/10 text-slate-300 px-2.5 py-1 rounded-md uppercase tracking-wider">{exp.category}</span>
                                        <span className="text-xs font-semibold text-slate-400">{new Date(exp.expense_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                    </div>
                                    <p className="font-bold text-white">{exp.description}</p>
                                </div>
                                <p className="font-bold text-rose-600 text-lg tabular-nums">- EGP {(Number(exp.amount) || 0).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/5 p-8 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Log Expense</h3>
                            <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-300 bg-white/5/10 hover:bg-white/5/10 p-1.5 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleLogExpense} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Expense Category</label>
                                <div className="relative">
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="appearance-none w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer"
                                    >
                                        <option value="Inventory Restock">Inventory Restock (Auto-adds to Inventory)</option>
                                        <option value="Equipment">Medical Equipment</option>
                                        <option value="Rent">Facility Rent</option>
                                        <option value="Other">Other Overhead</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">▼</div>
                                </div>
                            </div>

                            {formData.category === 'Inventory Restock' ? (
                                <div className="p-5 bg-brand-500/10 border border-brand-100 rounded-xl space-y-4">
                                    <div className="flex items-center gap-2 text-brand-300 mb-2">
                                        <Package className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Inventory Restock</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-800 uppercase tracking-wide mb-1.5">Select Item</label>
                                        <select
                                            required
                                            value={formData.restockItemId}
                                            onChange={(e) => setFormData({...formData, restockItemId: e.target.value})}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-brand-500/30 outline-none text-sm font-medium"
                                        >
                                            <option value="" disabled>-- Choose Item --</option>
                                            {inventory.map(inv => (
                                                <option key={inv.item_id} value={inv.item_id}>
                                                    {inv.item_name} (Current: {inv.current_stock})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-800 uppercase tracking-wide mb-1.5">Quantity Purchased</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={formData.restockQty}
                                            onChange={(e) => setFormData({...formData, restockQty: e.target.value})}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-brand-500/30 outline-none text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        placeholder="e.g., Monthly internet bill"
                                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Total Cost (EGP)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-rose-600 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold tabular-nums"
                                />
                            </div>

                            <div className="pt-6 border-t border-white/10 flex gap-3">
                                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 border border-white/10 text-slate-300 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Log Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;