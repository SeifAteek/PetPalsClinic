import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, FolderOpen, Plus, FileText, Activity, X, Stethoscope, UploadCloud } from 'lucide-react';

const HealthRecords = ({ clinicId }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [petData, setPetData] = useState(null);
    const [healthRecords, setHealthRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [showRecordModal, setShowRecordModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [formData, setFormData] = useState({
        diagnosis: '',
        treatment: '',
        vetName: ''
    });
    
    // Edit Pet State
    const [showEditPetModal, setShowEditPetModal] = useState(false);
    const [editPetForm, setEditPetForm] = useState({
        name: '',
        breed: '',
        species: 'Dog',
        age: '',
        status: 'Active'
    });

    const openEditPetModal = () => {
        setEditPetForm({
            name: petData.name || '',
            breed: petData.breed || '',
            species: petData.species || 'Dog',
            age: petData.age || '',
            status: petData.status || 'Active'
        });
        setShowEditPetModal(true);
    };

    const handleUpdatePet = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { error } = await supabase
            .from('pets')
            .update({
                name: editPetForm.name,
                breed: editPetForm.breed,
                species: editPetForm.species,
                age: parseInt(editPetForm.age) || null,
                status: editPetForm.status
            })
            .eq('pet_id', petData.pet_id);
            
        if (error) {
            alert('Failed to update pet: ' + error.message);
        } else {
            setPetData(prev => ({ ...prev, ...editPetForm, age: parseInt(editPetForm.age) || null }));
            setSearchResults(prev => prev.map(p => p.pet_id === petData.pet_id ? { ...p, ...editPetForm, age: parseInt(editPetForm.age) || null } : p));
            setShowEditPetModal(false);
        }
        setIsSubmitting(false);
    };

    useEffect(() => {
        const searchPets = async () => {
            setIsLoading(true);
            
            let query = supabase
                .from('pets')
                .select('*')
                .eq('clinic_id', clinicId)
                .order('name');
                
            if (searchQuery.trim()) {
                query = query.ilike('name', `%${searchQuery}%`);
            }
            
            const { data: pets, error } = await query.limit(30);

            if (error) {
                console.error('Pet search failed:', error);
                setSearchResults([]);
                if (!searchQuery.trim()) {
                    setPetData(null);
                    setHealthRecords([]);
                }
                setIsLoading(false);
                return;
            }

            const results = pets || [];
            setSearchResults(results);

            if (results.length === 0) {
                if (!searchQuery.trim()) {
                    setPetData(null);
                    setHealthRecords([]);
                }
            }
            // Removed auto-select logic to allow user to see the grid

            setIsLoading(false);
        };

        const timeoutId = setTimeout(() => searchPets(), 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const selectPet = async (pet) => {
        setPetData(pet);
        await fetchMedicalHistory(pet.pet_id);
    };

    const fetchMedicalHistory = async (petId) => {
        const { data: records, error } = await supabase
            .from('medical_records')
            .select('*, clinics(name)')
            .eq('pet_id', petId)
            .order('visit_date', { ascending: false });

        if (error) {
            console.error('Failed to load medical records:', error);
            setHealthRecords([]);
            return;
        }
        setHealthRecords(records || []);
    };

    const handleSaveRecord = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalFileUrl = null;
            let finalFileType = null;

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `med-${Date.now()}.${fileExt}`;
                const filePath = `medical_docs/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('pet_files').upload(filePath, selectedFile);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('pet_files').getPublicUrl(filePath);
                finalFileUrl = urlData.publicUrl;
                finalFileType = selectedFile.type || fileExt;
            }

            const { error } = await supabase.from('medical_records').insert([{
                pet_id: petData.pet_id,
                clinic_id: clinicId,
                diagnosis: formData.diagnosis,
                treatment: formData.treatment,
                vet_name: formData.vetName,
                attachment_url: finalFileUrl,
                attachment_type: finalFileType
            }]);

            if (error) throw error;

            setShowRecordModal(false);
            setFormData({ diagnosis: '', treatment: '', vetName: '' });
            setSelectedFile(null);
            fetchMedicalHistory(petData.pet_id);
        } catch (err) {
            alert("Failed to save: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clinicNameFor = (record) => record.clinics?.name || 'Unknown clinic';

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Health Records
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Search any patient by name to view their full medical history across all clinics.
                    </p>
                </div>
            </div>

            <div className="mb-8 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search by pet name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-12 py-4 rounded-2xl clinic-card border-white/10 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-100 shadow-sm transition-all text-lg font-medium"
                />
                {isLoading && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <div className="animate-spin w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full"></div>
                    </div>
                )}
            </div>

            {searchResults.length > 0 && !petData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 animate-in fade-in duration-300">
                    {searchResults.map((pet) => (
                        <div 
                            key={pet.pet_id}
                            onClick={() => selectPet(pet)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-brand-400 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center text-center group clinic-card"
                        >
                            <div className="w-16 h-16 rounded-full border-2 border-white/10 overflow-hidden bg-white/5 mb-4 group-hover:border-brand-400 transition-colors flex items-center justify-center">
                                {pet.avatar_url ? (
                                    <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] uppercase font-bold text-slate-400">No Pic</span>
                                )}
                            </div>
                            <h4 className="text-lg font-bold text-[color:var(--pp-text-primary)] leading-tight">{pet.name}</h4>
                            <p className="text-xs font-semibold text-slate-500 mt-1 mb-4">{pet.breed || 'Unknown Breed'} • {pet.age ? `${pet.age} Years` : 'Age Unknown'}</p>
                            <div className="mt-auto flex gap-2 w-full justify-center">
                                <span className="bg-white/5 border border-white/10 text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">{pet.species}</span>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${pet.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                    {pet.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {petData ? (
                <div className="flex-1 overflow-y-auto pr-2 pb-8 animate-in slide-in-from-bottom-4 duration-300">
                    <button 
                        onClick={() => setPetData(null)}
                        className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        ← Back to Patients
                    </button>
                    <div className="bg-white/5 rounded-2xl p-6 mb-8 shadow-sm border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="w-20 h-20 rounded-full border border-white/10 overflow-hidden bg-white/5/5 flex items-center justify-center shrink-0">
                                {petData.avatar_url ? (
                                    <img src={petData.avatar_url} alt={petData.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs uppercase font-bold text-slate-400">No Pic</span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">{petData.name}</h3>
                                <p className="text-sm font-semibold text-slate-500 mt-1">{petData.breed || 'Unknown Breed'} • {petData.age ? `${petData.age} Years` : 'Unknown Age'}</p>
                                <div className="mt-3 flex gap-2 justify-center md:justify-start">
                                    <span className="bg-white/5/10 text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide">{petData.species}</span>
                                    <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wide ${petData.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {petData.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button onClick={openEditPetModal} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-colors shrink-0">
                                Edit Info
                            </button>
                            <button onClick={() => setShowRecordModal(true)} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-colors shrink-0">
                                <Plus className="w-5 h-5" />
                                New Record
                            </button>
                        </div>
                    </div>

                    <h4 className="font-bold text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-500" />
                        Clinical History
                        <span className="text-xs font-semibold text-slate-400 ml-1">({healthRecords.length} record{healthRecords.length === 1 ? '' : 's'})</span>
                    </h4>

                    {healthRecords.length === 0 ? (
                        <div className="text-center py-16 bg-white/5/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center">
                            <FolderOpen className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No medical history found for {petData.name}.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-white/10 ml-4 pl-8 space-y-8">
                            {healthRecords.map(record => (
                                <div key={record.record_id} className="relative group">
                                    <div className="absolute -left-[41px] top-6 w-4 h-4 rounded-full bg-white/5 border-4 border-brand-500 shadow-sm group-hover:scale-125 transition-transform z-10"></div>

                                    <div className="bg-white/5 p-6 rounded-2xl shadow-sm border border-white/10 hover:border-white/20 transition-colors">
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                            <div>
                                                <p className="font-bold text-white text-lg">{new Date(record.visit_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                                                    <Stethoscope className="w-3.5 h-3.5" />
                                                    Attending: {record.vet_name}
                                                    <span className="text-slate-300">·</span>
                                                    {clinicNameFor(record)}
                                                    {record.clinic_id === clinicId && (
                                                        <span className="text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">Your clinic</span>
                                                    )}
                                                </p>
                                            </div>

                                            {record.attachment_url && (
                                                <a href={record.attachment_url} target="_blank" rel="noreferrer" className="bg-white/5/5 hover:bg-white/5/10 border border-white/10 text-slate-200 p-2.5 rounded-lg transition-colors text-sm font-semibold flex items-center gap-2 shrink-0">
                                                    <FileText className="w-4 h-4 text-slate-500" /> View Attachment
                                                </a>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white/5/5 p-4 rounded-xl border border-white/10">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnosis</p>
                                                <p className="text-sm font-medium text-slate-100">{record.diagnosis}</p>
                                            </div>
                                            <div className="bg-white/5/5 p-4 rounded-xl border border-white/10">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Treatment Plan</p>
                                                <p className="text-sm text-slate-200 leading-relaxed">{record.treatment}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : !searchResults.length && !isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <FolderOpen className="w-16 h-16 mb-4 text-slate-200" />
                    <p className="font-semibold text-slate-500">
                        {searchQuery.trim() ? 'No patients found with that name' : 'No patients found in the clinic'}
                    </p>
                </div>
            ) : null}

            {showRecordModal && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/5 p-8 rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">New Clinical Entry</h3>
                            <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-slate-300 bg-white/5/10 hover:bg-white/5/10 p-1.5 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRecord} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Veterinary Surgeon</label>
                                <input type="text" required value={formData.vetName} onChange={(e) => setFormData({...formData, vetName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Primary Diagnosis</label>
                                <input type="text" required value={formData.diagnosis} onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} placeholder="e.g. Bacterial Skin Infection" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Treatment & Notes</label>
                                <textarea rows="4" required value={formData.treatment} onChange={(e) => setFormData({...formData, treatment: e.target.value})} placeholder="Describe medication, dosage, and next steps..." className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">File Upload (Optional)</label>
                                <div className="border border-white/10 bg-white/5/5 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <input type="file" id="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="hidden" />
                                    <label htmlFor="file" className="flex items-center gap-2 cursor-pointer w-full text-sm">
                                        <div className="clinic-card border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-300 font-semibold hover:border-brand-400 hover:text-brand-400 transition-colors">
                                            <UploadCloud className="w-4 h-4" /> Choose File
                                        </div>
                                        <span className="text-slate-500 truncate text-xs flex-1 ml-2">{selectedFile ? selectedFile.name : 'No file selected'}</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex gap-3">
                                <button type="button" onClick={() => setShowRecordModal(false)} className="flex-1 border border-white/10 text-slate-300 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Pet Modal */}
            {showEditPetModal && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/5 p-8 rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Edit Patient Info</h3>
                            <button onClick={() => setShowEditPetModal(false)} className="text-slate-400 hover:text-slate-300 bg-white/5/10 hover:bg-white/5/10 p-1.5 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePet} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Name</label>
                                <input type="text" required value={editPetForm.name} onChange={(e) => setEditPetForm({...editPetForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Species</label>
                                    <div className="relative">
                                        <select value={editPetForm.species} onChange={(e) => setEditPetForm({...editPetForm, species: e.target.value})} className="appearance-none w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer">
                                            <option value="Dog">Dog</option>
                                            <option value="Cat">Cat</option>
                                            <option value="Bird">Bird</option>
                                            <option value="Small Animal">Small Animal</option>
                                            <option value="Reptile">Reptile</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">▼</div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Breed</label>
                                    <input type="text" value={editPetForm.breed} onChange={(e) => setEditPetForm({...editPetForm, breed: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Age</label>
                                    <input type="number" min="0" value={editPetForm.age} onChange={(e) => setEditPetForm({...editPetForm, age: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Status</label>
                                    <div className="relative">
                                        <select value={editPetForm.status} onChange={(e) => setEditPetForm({...editPetForm, status: e.target.value})} className="appearance-none w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                            <option value="Deceased">Deceased</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">▼</div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/10 flex gap-3">
                                <button type="button" onClick={() => setShowEditPetModal(false)} className="flex-1 border border-white/10 text-slate-300 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Update Patient'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthRecords;
