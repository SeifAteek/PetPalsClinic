import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Shield, X, Mail, CheckCircle2, XCircle, Stethoscope, Phone } from 'lucide-react';

const StaffManagement = ({ clinicId }) => {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        role: 'Associate Vet'
    });

    const fetchStaff = async () => {
        setIsLoading(true);
        // Join with profiles to get the staff names and emails
        const { data, error } = await supabase
            .from('clinic_staff')
            .select(`
        staff_id,
        role,
        is_active,
        profiles(user_name, email)
      `)
            .eq('clinic_id', clinicId);

        if (error) console.error("Error fetching staff:", error);
        else setStaff(data || []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (clinicId) fetchStaff();
    }, [clinicId]);

    const handleAddStaff = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // 1. Find the user in the profiles table by email
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('email', formData.email)
                .single();

            if (userError || !userData) {
                throw new Error("User not found. Make sure they have a PetPals account first.");
            }

            // 2. Add them to the clinic_staff table
            const { error: staffError } = await supabase
                .from('clinic_staff')
                .insert([{
                    clinic_id: clinicId,
                    user_id: userData.user_id,
                    role: formData.role
                }]);

            if (staffError) {
                if (staffError.code === '23505') throw new Error("This user is already a member of your staff.");
                throw staffError;
            }

            setShowAddModal(false);
            setFormData({ email: '', role: 'Associate Vet' });
            fetchStaff();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStaffStatus = async (staffId, currentStatus) => {
        const { error } = await supabase
            .from('clinic_staff')
            .update({ is_active: !currentStatus })
            .eq('staff_id', staffId)
            .eq('clinic_id', clinicId);

        if (!error) fetchStaff();
    };

    return (
        <div className="flex flex-col h-full relative p-6 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="w-7 h-7 text-brand-400" />
                        Staff Directory
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Manage veterinarians, technicians, and administrative staff.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-all focus:ring-2 focus:ring-slate-900/50 shrink-0"
                >
                    <UserPlus className="w-5 h-5" />
                    Invite Staff
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-8">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : staff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5/50">
                        <Users className="w-16 h-16 text-slate-300 mb-4" />
                        <h4 className="text-lg font-bold text-slate-200">No staff members found</h4>
                        <p className="text-slate-500 mt-1">Invite team members to collaborate in your clinic.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-6 text-sm font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-4 py-2 rounded-lg"
                        >
                            + Add First Staff Member
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {staff.map((member) => (
                            <div key={member.staff_id} className={`clinic-card border-white/10 rounded-2xl p-6 shadow-sm transition-all flex flex-col relative ${!member.is_active ? 'opacity-70 grayscale-[50%]' : 'hover:shadow-md hover:border-brand-500/30'}`}>
                                
                                {/* Status Pill */}
                                <div className="absolute top-5 right-5">
                                    <span className={`flex items-center gap-1 min-w-[80px] justify-center text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                        member.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
                                    }`}>
                                        {member.is_active ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                                        {member.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                {/* Avatar & Info */}
                                <div className="mb-5 flex flex-col items-center text-center mt-2">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-sm mb-4 ${
                                        member.role === 'Receptionist' ? 'bg-indigo-100 text-indigo-600' : 
                                        member.role === 'Head Vet' ? 'bg-brand-500/100/20 text-brand-400' :
                                        'bg-sky-100 text-sky-600'
                                    }`}>
                                        {member.role === 'Receptionist' ? <Phone className="w-7 h-7" /> : <Stethoscope className="w-7 h-7" />}
                                    </div>
                                    <h4 className="font-bold text-white text-lg leading-tight">{member.profiles?.user_name || 'Unnamed User'}</h4>
                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1 justify-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                                        <Mail className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{member.profiles?.email}</span>
                                    </p>
                                </div>

                                <div className="mt-auto pt-5 border-t border-white/10 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-brand-300 bg-brand-500/10 px-2.5 py-1.5 rounded-lg">
                                        <Shield className="w-3.5 h-3.5" />
                                        {member.role}
                                    </span>
                                    <button
                                        onClick={() => toggleStaffStatus(member.staff_id, member.is_active)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                            member.is_active 
                                                ? 'text-rose-600 hover:bg-rose-50' 
                                                : 'text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                    >
                                        {member.is_active ? 'Deactivate' : 'Reactivate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL: Add Staff */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/5 p-8 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Invite Team Member</h3>
                                <p className="text-sm text-slate-500 mt-1">Add existing PetPals users to your clinic.</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-300 bg-white/5/10 hover:bg-white/5/10 p-1.5 rounded-lg transition-colors shrink-0 outline-none">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddStaff} className="space-y-6">
                            <div className="bg-brand-500/10 border border-brand-100 p-4 rounded-xl text-sm text-brand-800 flex flex-col gap-1">
                                <span className="font-bold flex items-center gap-1.5"><Shield className="w-4 h-4"/> Prerequisite</span>
                                <span>The user must already have registered for a PetPals account. Ask them for their registered email.</span>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-2">Registered Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="doctor@example.com"
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-200 mb-2">Assigned Role</label>
                                <div className="relative">
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        className="appearance-none w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer"
                                    >
                                        <option value="Associate Vet">Associate Vet</option>
                                        <option value="Receptionist">Receptionist</option>
                                        <option value="Technician">Technician</option>
                                        <option value="Head Vet">Head Vet</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">▼</div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-white/10 text-slate-300 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <UserPlus className="w-5 h-5"/>}
                                    {isSubmitting ? 'Searching...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;