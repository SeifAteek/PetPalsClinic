import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PetPalsBrand } from '@petpals/theme/PetPalsLogo.jsx'
import MeshBackground from '@petpals/theme/MeshBackground.jsx';
import ThemeToggle from '@petpals/theme/ThemeToggle.jsx';
import {
    Calendar, Clock, LayoutDashboard, HeartPulse,
    MessageSquare, PackageSearch, Receipt, TrendingUp,
    Settings as SettingsIcon, Users, LogOut, Loader2, ClipboardList, Stethoscope
} from 'lucide-react';

import Login from './Login';
import Appointments from './Appointments';
import HealthRecords from './HealthRecords';
import ClientChat from './ClientChat';
import Settings from './Settings';
import Inventory from "./Inventory";
import Billing from "./Billing";
import Analytics from "./Analytics";
import PatientIntake from "./PatientIntake";
import AppointmentHistory from "./AppointmentHistory";
import StaffManagement from "./StaffManagement";
import CalendarView from "./CalendarView";
import ClinicServices from "./ClinicServices";

const ClinicDashboard = () => {
    const [session, setSession] = useState(null);
    const [clinicData, setClinicData] = useState(null);
    const [activeTab, setActiveTab] = useState('appointments');
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchClinicProfile(session.user.id);
            else setIsInitializing(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchClinicProfile(session.user.id);
            else setClinicData(null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchClinicProfile = async (userId) => {
        const { data } = await supabase
            .from('clinics')
            .select('*')
            .eq('owner_id', userId)
            .single();

        if (data) setClinicData(data);
        setIsInitializing(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (isInitializing) {
        return (
            <div className="relative flex min-h-screen flex-col items-center justify-center" style={{ background: '#F0F4F8' }}>
                <MeshBackground />
                <Loader2 className="relative z-10 mb-4 h-10 w-10 animate-spin text-[#5EC4F0]" />
                <h2 className="relative z-10 animate-pulse text-lg font-medium text-[var(--pp-text-muted)]">Initializing workspace…</h2>
            </div>
        );
    }

    if (!session) {
        return <Login onLoginSuccess={(user) => fetchClinicProfile(user.id)} />;
    }

    if (session && !clinicData) {
        return (
            <div className="relative flex min-h-screen items-center justify-center p-8" style={{ background: '#F0F4F8' }}>
                <MeshBackground />
                <div className="pp-card relative z-10 max-w-md w-full p-8 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm" style={{ background: 'linear-gradient(135deg,#5EC4F0,#1A1A2E)' }}>
                        <Stethoscope className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-[var(--pp-text-primary)]">Welcome to PetPals</h2>
                    <p className="mb-8 text-[var(--pp-text-muted)]">Your account is active, but we need to set up your clinic profile in the database.</p>
                    <button onClick={handleLogout} className="btn-secondary w-full">
                        Log out
                    </button>
                </div>
            </div>
        );
    }

    const navigation = [
        { id: 'appointments', label: 'Appointments', icon: Clock },
        { id: 'services', label: 'Clinic services', icon: ClipboardList },
        { id: 'calendar', label: 'Visual schedule', icon: Calendar },
        { id: 'history', label: 'Appointment history', icon: LayoutDashboard },
        { id: 'intake', label: 'Patient intake', icon: Users },
        { id: 'records', label: 'Health records', icon: HeartPulse },
        { id: 'chat', label: 'Client chat', icon: MessageSquare },
        { id: 'inventory', label: 'Inventory', icon: PackageSearch },
        { id: 'billing', label: 'Billing & invoices', icon: Receipt },
        { id: 'analytics', label: 'Revenue analytics', icon: TrendingUp },
        { id: 'staff', label: 'Staff management', icon: Users },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];

    const currentTabLabel = navigation.find(n => n.id === activeTab)?.label || 'Dashboard';

    return (
        <div className="pp-dashboard-frame text-[var(--pp-text-primary)]">
            <MeshBackground />

            {/* ── Icon rail sidebar ── */}
            <aside className="pp-icon-rail" style={{ position: 'relative', zIndex: 20 }}>
                {/* Logo mark */}
                <div className="mb-4 px-2">
                    <PetPalsBrand logoSize="sm" />
                </div>

                {/* Divider */}
                <div style={{ width: 36, height: 1, background: 'var(--pp-card-border)', margin: '8px 0 12px' }} />

                {/* Nav icons */}
                {navigation.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        title={item.label}
                        className={`pp-icon-rail-item ${activeTab === item.id ? 'active' : ''}`}
                    >
                        <item.icon className="w-5 h-5" />
                    </button>
                ))}

                {/* Spacer + logout */}
                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                    <div style={{ width: 36, height: 1, background: 'var(--pp-card-border)', margin: '0 0 8px' }} />
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="pp-icon-rail-item"
                        style={{ color: 'var(--pp-text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--pp-text-muted)'; }}
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </aside>

            {/* ── Main content column ── */}
            <div className="flex flex-col flex-1 min-w-0" style={{ position: 'relative', zIndex: 10 }}>

                {/* Sticky top bar */}
                <header className="pp-topbar">
                    <h2 className="text-sm font-bold text-[var(--pp-text-primary)] mr-3 whitespace-nowrap shrink-0">
                        {currentTabLabel}
                    </h2>
                    <input
                        className="pp-topbar-search"
                        placeholder="Search patients, appointments, records…"
                        readOnly
                        aria-label="Search"
                    />
                    <div className="ml-auto flex items-center gap-3 shrink-0">
                        <ThemeToggle />
                        <span className="pp-tag pp-tag--sky hidden sm:inline-flex">Live clinic</span>
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg,#5EC4F0,#1A1A2E)' }}
                        >
                            {clinicData.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">

                        {/* ── Hero banner ── */}
                        <div className="pp-hero-banner">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#5EC4F0' }}>
                                    PetPals Clinic
                                </p>
                                <h2>{clinicData.name}</h2>
                                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>
                                    {currentTabLabel} — manage your clinic smarter
                                </p>
                            </div>
                            <div className="shrink-0 opacity-20">
                                <HeartPulse className="w-24 h-24" style={{ color: '#1A1A2E' }} />
                            </div>
                        </div>

                        {/* ── Tab content ── */}
                        {activeTab === 'appointments' && <Appointments clinicId={clinicData.clinic_id} clinicData={clinicData} />}
                        {activeTab === 'services'     && <ClinicServices clinicId={clinicData.clinic_id} />}
                        {activeTab === 'history'      && <AppointmentHistory clinicId={clinicData.clinic_id} />}
                        {activeTab === 'records'      && <HealthRecords clinicId={clinicData.clinic_id} />}
                        {activeTab === 'chat'         && <ClientChat clinicId={clinicData.clinic_id} />}
                        {activeTab === 'settings'     && <Settings clinicData={clinicData} setClinicData={setClinicData} />}
                        {activeTab === 'inventory'    && <Inventory clinicId={clinicData.clinic_id} />}
                        {activeTab === 'billing'      && <Billing clinicId={clinicData.clinic_id} clinicData={clinicData} />}
                        {activeTab === 'analytics'    && <Analytics clinicId={clinicData.clinic_id} />}
                        {activeTab === 'intake'       && <PatientIntake clinicId={clinicData.clinic_id} />}
                        {activeTab === 'staff'        && <StaffManagement clinicId={clinicData.clinic_id} />}
                        {activeTab === 'calendar'     && <CalendarView clinicId={clinicData.clinic_id} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClinicDashboard;
