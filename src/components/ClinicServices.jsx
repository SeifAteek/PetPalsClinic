import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, ClipboardList, Loader2 } from 'lucide-react';

/** Manage `clinic_procedures` (services offered + price list). */
const ClinicServices = ({ clinicId }) => {
    const [procedures, setProcedures] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const fetchProcedures = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('clinic_procedures')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name', { ascending: true });

        if (error) console.error(error);
        else setProcedures(data || []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchProcedures();
    }, [clinicId]);

    const handleAdd = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        const p = parseFloat(price);
        if (!trimmed || Number.isNaN(p) || p < 0) {
            alert('Enter a service name and a valid price.');
            return;
        }
        setIsSaving(true);
        const { error } = await supabase.from('clinic_procedures').insert([
            {
                clinic_id: clinicId,
                name: trimmed,
                price: p,
            },
        ]);
        setIsSaving(false);
        if (error) {
            alert('Could not add service: ' + error.message);
            return;
        }
        setName('');
        setPrice('');
        fetchProcedures();
    };

    const handleDelete = async (procedureId) => {
        if (!window.confirm('Remove this service from your clinic listing?')) return;
        const { error } = await supabase
            .from('clinic_procedures')
            .delete()
            .eq('procedure_id', procedureId)
            .eq('clinic_id', clinicId);
        if (error) alert('Delete failed: ' + error.message);
        else fetchProcedures();
    };

    return (
        <div className="space-y-8">
            <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-100">
                    <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Services &amp; pricing</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        These appear in the PetPals app on your vet profile and power grooming filters when names include &quot;groom&quot;.
                    </p>
                </div>
            </div>

            <form onSubmit={handleAdd} className="clinic-card border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-brand-400" /> Add a service
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Service name</label>
                        <input
                            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                            placeholder="e.g. Grooming — full bath"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Price (EGP)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                            placeholder="0.00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full md:w-auto px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add
                        </button>
                    </div>
                </div>
            </form>

            <div className="clinic-card border-white/10 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-white/5/5/80">
                    <h4 className="font-semibold text-slate-100">Current services</h4>
                </div>
                {isLoading ? (
                    <div className="flex justify-center py-16 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : procedures.length === 0 ? (
                    <p className="text-slate-500 text-sm px-6 py-12 text-center">No services yet. Add your first one above.</p>
                ) : (
                    <ul className="divide-y divide-white/10">
                        {procedures.map((proc) => (
                            <li key={proc.procedure_id} className="flex items-center justify-between px-6 py-4 hover:bg-white/10/50 gap-4">
                                <div>
                                    <p className="font-medium text-white">{proc.name}</p>
                                    <p className="text-sm text-brand-400 font-semibold mt-0.5">{Number(proc.price).toLocaleString()} EGP</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(proc.procedure_id)}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                    title="Remove"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ClinicServices;
