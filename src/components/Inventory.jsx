import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, AlertTriangle, Search, X, Pill, Syringe, ShoppingBag, Activity } from 'lucide-react';

const Inventory = ({ clinicId }) => {
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [showItemModal, setShowItemModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        itemName: '',
        category: 'Medicine',
        currentStock: 0,
        lowStockThreshold: 10,
        unitPrice: 0.00
    });

    const fetchInventory = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('item_name', { ascending: true });

        if (error) console.error("Error fetching inventory:", error);
        else setInventory(data || []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchInventory();
    }, [clinicId]);

    const handleSaveItem = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const { error } = await supabase
            .from('inventory_items')
            .insert([{
                clinic_id: clinicId,
                item_name: formData.itemName,
                category: formData.category,
                current_stock: parseInt(formData.currentStock),
                low_stock_threshold: parseInt(formData.lowStockThreshold),
                unit_price: parseFloat(formData.unitPrice)
            }]);

        if (error) {
            alert("Failed to add item.");
        } else {
            setShowItemModal(false);
            setFormData({ itemName: '', category: 'Medicine', currentStock: 0, lowStockThreshold: 10, unitPrice: 0 });
            fetchInventory();
        }
        setIsSubmitting(false);
    };

    const handleStockUpdate = async (itemId, newStock) => {
        if (newStock < 0) return;
        const { error } = await supabase
            .from('inventory_items')
            .update({ current_stock: newStock })
            .eq('item_id', itemId)
            .eq('clinic_id', clinicId);

        if (!error) {
            setInventory(prev => prev.map(item => item.item_id === itemId ? { ...item, current_stock: newStock } : item));
        }
    };

    const filteredInventory = inventory.filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Medicine': return <Pill className="w-4 h-4" />;
            case 'Vaccine': return <Syringe className="w-4 h-4" />;
            case 'Consumable': return <Activity className="w-4 h-4" />;
            case 'Retail': return <ShoppingBag className="w-4 h-4" />;
            default: return <Package className="w-4 h-4" />;
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Clinic Inventory
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Manage medicines, vaccines, and retail stock levels.</p>
                </div>
                <button onClick={() => setShowItemModal(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-colors shrink-0">
                    <Plus className="w-5 h-5" />
                    Add Item
                </button>
            </div>

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search inventory items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-md pl-11 pr-4 py-3 rounded-xl clinic-card border-white/10 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-100 shadow-sm transition-all text-sm"
                />
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center pt-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
            ) : filteredInventory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5/50">
                    <Package className="w-16 h-16 text-slate-300 mb-4" />
                    <h4 className="text-lg font-bold text-slate-200">{searchQuery ? 'No items match your search' : 'Inventory is empty'}</h4>
                    <p className="text-slate-500 mt-1 max-w-sm">{searchQuery ? 'Try adjusting your search query.' : 'Click "Add Item" to start managing your stock.'}</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredInventory.map(item => {
                            const isLowStock = item.current_stock <= item.low_stock_threshold;

                            return (
                                <div key={item.item_id} className={`p-6 clinic-card flex flex-col ${isLowStock ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/30' : 'hover:shadow-md'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 pr-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                {getCategoryIcon(item.category)}
                                                {item.category}
                                            </div>
                                            <h4 className="text-lg font-bold text-[color:var(--pp-text-primary)] leading-tight">{item.item_name}</h4>
                                        </div>
                                        <div className="bg-white/5/5 border border-white/10 px-2.5 py-1.5 rounded-lg shrink-0">
                                            <span className="text-[10px] font-bold text-slate-400 block leading-none mb-0.5 uppercase tracking-wider">Price</span>
                                            <span className="font-bold text-[color:var(--pp-text-primary)] text-sm leading-none">EGP {item.unit_price}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/10">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">In Stock</p>
                                                <p className={`text-3xl font-black leading-none ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-[color:var(--pp-text-primary)]'}`}>
                                                    {item.current_stock}
                                                </p>
                                            </div>

                                            <div className="flex gap-1.5 bg-white/5/10 rounded-xl p-1.5 border border-white/10/50">
                                                <button onClick={() => handleStockUpdate(item.item_id, item.current_stock - 1)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg shadow-sm text-slate-300 font-bold hover:text-brand-400 hover:border-brand-500/30 border border-transparent transition-all active:scale-95">-</button>
                                                <button onClick={() => handleStockUpdate(item.item_id, item.current_stock + 1)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg shadow-sm text-slate-300 font-bold hover:text-brand-400 hover:border-brand-500/30 border border-transparent transition-all active:scale-95">+</button>
                                            </div>
                                        </div>
                                        
                                        {isLowStock && (
                                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-100/50 px-3 py-2.5 rounded-lg border border-rose-200">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                Low Stock Alert
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal */}
            {showItemModal && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white/5 p-8 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Add Inventory Item</h3>
                            <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-300 bg-white/5/10 hover:bg-white/5/10 p-1.5 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveItem} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Item Name</label>
                                <input type="text" required value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Category</label>
                                <div className="relative">
                                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="appearance-none w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium">
                                        <option value="Medicine">Medicine</option>
                                        <option value="Vaccine">Vaccine</option>
                                        <option value="Consumable">Consumable</option>
                                        <option value="Retail">Retail</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">▼</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Initial Stock</label>
                                    <input type="number" min="0" required value={formData.currentStock} onChange={(e) => setFormData({...formData, currentStock: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Alert Threshold</label>
                                    <input type="number" min="1" required value={formData.lowStockThreshold} onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Unit Price (EGP)</label>
                                <input type="number" step="0.01" min="0" required value={formData.unitPrice} onChange={(e) => setFormData({...formData, unitPrice: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                            </div>

                            <div className="pt-6 border-t border-white/10 flex gap-3">
                                <button type="button" onClick={() => setShowItemModal(false)} className="flex-1 border border-white/10 text-slate-300 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;