import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, Building2, MapPin, Phone, Settings as SettingsIcon, Save } from 'lucide-react';

const Settings = ({ clinicData, setClinicData }) => {
    const [formData, setFormData] = useState({ name: '', location: '', phone: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Logo Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (clinicData) {
            setFormData({
                name: clinicData.name || '',
                location: clinicData.location || '',
                phone: clinicData.phone || ''
            });
            setPreviewUrl(clinicData.logo_url);
        }
    }, [clinicData]);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        try {
            let finalLogoUrl = previewUrl;

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `logo-${clinicData.clinic_id}.${fileExt}`;
                const filePath = `clinic_assets/${fileName}`;

                // Using upsert: true to overwrite previous logo if it exists
                const { error: uploadError } = await supabase.storage
                    .from('pet_files')
                    .upload(filePath, selectedFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('pet_files')
                    .getPublicUrl(filePath);

                finalLogoUrl = urlData.publicUrl;
            }

            const { data, error } = await supabase
                .from('clinics')
                .update({
                    ...formData,
                    logo_url: finalLogoUrl
                })
                .eq('clinic_id', clinicData.clinic_id)
                .select();

            if (error) throw error;

            setMessage('Settings updated successfully!');
            setClinicData(data[0]);
            
            // Auto hide message after 3 seconds
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Error: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative max-w-5xl">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Clinic Profile
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Manage your clinic's identity, contact information, and preferences.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50 shrink-0 outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <div className={`p-4 mb-6 rounded-xl font-semibold text-sm animate-in fade-in slide-in-from-top-2 flex items-center shadow-sm border ${message.includes('Error') ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
                    {message}
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 pb-8">
                <form id="settings-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Logo Branding */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="clinic-card border-white/10 rounded-2xl p-6 shadow-sm">
                            <label className="block text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                Brand Logo
                            </label>

                            <label
                                htmlFor="logo-upload"
                                className="relative group w-full aspect-square bg-white/5/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden hover:border-brand-400 hover:bg-brand-500/10/50 transition-all cursor-pointer shadow-sm"
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Logo Preview" className="w-full h-full object-contain p-6 bg-white/5" />
                                ) : (
                                    <div className="text-center p-6 flex flex-col items-center">
                                        <div className="w-16 h-16 bg-white/5 rounded-full shadow-sm flex items-center justify-center mb-4">
                                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand-500 transition-colors" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-200 mb-1 group-hover:text-brand-300 transition-colors">Click to Upload</p>
                                    </div>
                                )}

                                {/* Hover State Overlay */}
                                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                    <span className="text-white font-bold text-sm bg-brand-600 px-5 py-2.5 rounded-full shadow-sm">Change Image</span>
                                </div>

                                {/* Hidden Input */}
                                <input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs font-medium text-slate-500 text-center mt-4 bg-white/5/5 p-3 rounded-lg border border-white/10">
                                Supported formats: PNG, JPG, SVG.<br/> Recommended size: 512x512px.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Information */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="clinic-card border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    Clinic Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5/5 border border-white/10 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-medium text-white text-base transition-all"
                                    placeholder="Enter your clinic's business name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    Location / Address
                                </label>
                                <textarea
                                    rows="3"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5/5 border border-white/10 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-medium text-white text-base resize-none transition-all"
                                    placeholder="Full street address, city, postcode"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    Direct Contact Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5/5 border border-white/10 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-medium text-white text-base transition-all"
                                    placeholder="+20 1..."
                                />
                            </div>
                        </div>

                        {/* Additional Preferences Section Placeholder to show it's a real dashboard settings area */}
                        <div className="bg-white/5/5 border border-white/10 rounded-2xl p-6 shadow-sm opacity-60">
                             <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <SettingsIcon className="w-4 h-4 text-slate-400" />
                                Preferences
                            </h4>
                            <p className="text-sm text-slate-500 font-medium">Notification and display preferences will be available in the next update.</p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;