import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, ImagePlus, Info, ShieldCheck, Camera, PawPrint, CheckCircle2 } from 'lucide-react';

const PatientIntake = ({ clinicId }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        petName: '',
        species: 'Dog',
        breed: '',
        age: '',
        guestOwnerName: '',
        guestPhone: ''
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage('');

        try {
            let finalAvatarUrl = null;

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('pet_files').upload(filePath, selectedFile);
                if (uploadError) throw new Error('Failed to upload image.');

                const { data: publicUrlData } = supabase.storage.from('pet_files').getPublicUrl(filePath);
                finalAvatarUrl = publicUrlData.publicUrl;
            }

            const { error: dbError } = await supabase.from('pets').insert([{
                clinic_id: clinicId,
                name: formData.petName,
                species: formData.species,
                breed: formData.breed,
                age: formData.age ? parseInt(formData.age) : null,
                guest_owner_name: formData.guestOwnerName,
                guest_phone: formData.guestPhone,
                avatar_url: finalAvatarUrl,
                status: 'Active'
            }]);

            if (dbError) {
                console.error("Supabase DB Error:", dbError);
                throw new Error(`DB Error: ${dbError.message}`);
            }

            setSuccessMessage(`${formData.petName} has been successfully registered!`);
            setFormData({ petName: '', species: 'Dog', breed: '', age: '', guestOwnerName: '', guestPhone: '' });
            setSelectedFile(null);
            setPreviewUrl(null);
            
            setTimeout(() => setSuccessMessage(''), 5000);

        } catch (err) {
            console.error("Submission Error:", err);
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Patient Intake
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Register a new walk-in pet and owner into the clinic system.</p>
                </div>
            </div>

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 flex items-center gap-3 animate-in fade-in duration-300">
                    <div className="bg-emerald-100 p-1 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-700"/></div>
                    <span className="font-semibold">{successMessage}</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 pb-8">
                <form onSubmit={handleSubmit} className="clinic-card border-white/10 shadow-sm rounded-2xl max-w-5xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                        
                        {/* Pet Information */}
                        <div className="lg:col-span-3 p-8">
                            <div className="flex items-center gap-2 mb-6">
                                <PawPrint className="w-5 h-5 text-brand-400" />
                                <h4 className="text-lg font-bold text-white">Pet Details</h4>
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="w-full sm:w-1/3">
                                        <div className="relative group w-32 h-32 mx-auto sm:mx-0 rounded-full border-2 border-dashed border-slate-300 hover:border-brand-400 bg-white/5/5 flex items-center justify-center overflow-hidden transition-all cursor-pointer">
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            {previewUrl ? (
                                                <>
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-slate-900/40 hidden group-hover:flex items-center justify-center transition-all">
                                                        <Camera className="w-6 h-6 text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center">
                                                    <ImagePlus className="w-8 h-8 text-slate-400 mx-auto mb-1 group-hover:text-brand-500 transition-colors" />
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Photo</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-200 mb-1.5">Pet Name *</label>
                                            <input type="text" required value={formData.petName} onChange={(e) => setFormData({...formData, petName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder-slate-400 transition-all" placeholder="e.g. Bella" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Species</label>
                                                <div className="relative">
                                                    <select value={formData.species} onChange={(e) => setFormData({...formData, species: e.target.value})} className="appearance-none w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer">
                                                        <option value="Dog">Dog</option>
                                                        <option value="Cat">Cat</option>
                                                        <option value="Bird">Bird</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">▼</div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Age (Years)</label>
                                                <input type="number" min="0" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-center" placeholder="0" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Breed / Description</label>
                                    <input type="text" value={formData.breed} onChange={(e) => setFormData({...formData, breed: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder-slate-400 transition-all" placeholder="e.g. Golden Retriever" />
                                </div>
                            </div>
                        </div>

                        {/* Owner Information */}
                        <div className="lg:col-span-2 p-8 bg-white/5/5/50 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-6">
                                <UserPlus className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-lg font-bold text-white">Owner Details</h4>
                            </div>

                            <div className="bg-white/5 border text-xs border-indigo-100 p-4 rounded-xl text-indigo-800 mb-6 flex gap-3 items-start shadow-sm leading-relaxed">
                                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                <p><strong>Note for Walk-ins:</strong> This creates a temporary profile. The owner must download the PetPals app and link their phone number to gain digital access to records.</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Full Name *</label>
                                    <input type="text" required value={formData.guestOwnerName} onChange={(e) => setFormData({...formData, guestOwnerName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" placeholder="John Doe" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">Contact Phone Number</label>
                                    <div className="flex gap-2">
                                        <div className="w-16 px-0 py-3 rounded-xl border border-white/10 bg-white/5/10 text-slate-500 text-center font-medium shadow-inner shrink-0 text-sm flex items-center justify-center">+20</div>
                                        <input type="tel" value={formData.guestPhone} onChange={(e) => setFormData({...formData, guestPhone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" placeholder="10XXXXX" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-8">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-slate-900 text-white py-4 px-4 rounded-xl font-bold hover:bg-brand-600 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            Register Patient
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientIntake;