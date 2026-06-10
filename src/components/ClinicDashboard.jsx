import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PetPalsBrand } from '@petpals/theme/PetPalsLogo.jsx'
import MeshBackground from '@petpals/theme/MeshBackground.jsx';
import ThemeToggle from '@petpals/theme/ThemeToggle.jsx';
import {
    Calendar, Clock, LayoutDashboard, HeartPulse,
    MessageSquare, PackageSearch, Receipt, TrendingUp,
    Settings as SettingsIcon, Users, LogOut, Loader2, ClipboardList, Heart, Stethoscope
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

const SidebarItem = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-all duration-200 ${
            isActive ? 'pp-nav-active' : 'pp-nav-idle'
        }`}
    >
        <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-cerulean dark:text-brand-400' : 'opacity-60'}`} />
        <span className="text-sm">{label}</span>
    </button>
);

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
            <div className="relative flex min-h-screen flex-col items-center justify-center">
                <MeshBackground />
                <Loader2 className="relative z-10 mb-4 h-10 w-10 animate-spin text-brand-400" />
                <h2 className="relative z-10 animate-pulse text-lg font-medium text-[var(--pp-text-muted)]">Initializing workspace…</h2>
            </div>
        );
    }

    if (!session) {
        return <Login onLoginSuccess={(user) => fetchClinicProfile(user.id)} />;
    }

    if (session && !clinicData) {
        return (
            <div className="relative flex min-h-screen items-center justify-center p-8">
                <MeshBackground />
                <div className="pp-card relative z-10 max-w-md w-full p-8 text-center">
                    <div className="pp-brand-gradient mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-glow">
                        <Stethoscope className="on-brand h-8 w-8 keep-white" />
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
        <div className="pp-app-frame text-[var(--pp-text-primary)]">
            <MeshBackground />

            <aside className="pp-sidebar pp-sidebar--panel flex flex-col">
                <div className="border-b border-[var(--pp-card-border)] p-6">
                    <PetPalsBrand logoSize="md" subtitle="Clinic portal" />
                    <p className="mt-4 truncate text-sm font-medium text-[var(--pp-text-secondary)]">{clinicData.name}</p>
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
                    <div className="mb-3 mt-4 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--pp-text-muted)]">Core workflow</div>
                    {navigation.slice(0, 7).map(item => (
                        <SidebarItem key={item.id} icon={item.icon} label={item.label} isActive={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
                    ))}

                    <div className="mb-3 mt-8 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--pp-text-muted)]">Management</div>
                    {navigation.slice(7).map(item => (
                        <SidebarItem key={item.id} icon={item.icon} label={item.label} isActive={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
                    ))}
                </div>

                <div className="border-t border-[var(--pp-card-border)] p-4">
                    <button onClick={handleLogout} className="pp-nav-idle flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold hover:!bg-red-500/10 hover:!text-red-400">
                        <LogOut className="w-5 h-5" />
                        Sign out
                    </button>
                </div>
            </aside>

            <main className="pp-main-area flex flex-1 flex-col">
                <header className="pp-header pp-header--float flex shrink-0 items-center">
                    <h2 className="text-lg font-bold">{currentTabLabel}</h2>
                    <div className="ml-auto flex items-center gap-4">
                        <ThemeToggle />
                        <span className="pp-glass-chip hidden sm:inline-flex">
                            Live clinic
                        </span>
                        <div className="pp-liquid-glass pp-liquid-glass--pill pp-liquid-glass--resting flex h-9 w-9 items-center justify-center text-sm font-bold">
                            {clinicData.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="pp-content-scroll flex-1 px-4 pb-6 md:px-6">
                    <div className="max-w-7xl mx-auto h-full flex flex-col">
                        {activeTab === 'appointments' && <Appointments clinicId={clinicData.clinic_id} clinicData={clinicData} />}
                        {activeTab === 'services' && <ClinicServices clinicId={clinicData.clinic_id} />}
                        {activeTab === 'history' && <AppointmentHistory clinicId={clinicData.clinic_id} />}
                        {activeTab === 'records' && <HealthRecords clinicId={clinicData.clinic_id} />}
                        {activeTab === 'chat' && <ClientChat clinicId={clinicData.clinic_id} />}
                        {activeTab === 'settings' && <Settings clinicData={clinicData} setClinicData={setClinicData} />}
                        {activeTab === 'inventory' && <Inventory clinicId={clinicData.clinic_id} />}
                        {activeTab === 'billing' && <Billing clinicId={clinicData.clinic_id} clinicData={clinicData} />}
                        {activeTab === 'analytics' && <Analytics clinicId={clinicData.clinic_id} />}
                        {activeTab === 'intake' && <PatientIntake clinicId={clinicData.clinic_id} />}
                        {activeTab === 'staff' && <StaffManagement clinicId={clinicData.clinic_id} />}
                        {activeTab === 'calendar' && <CalendarView clinicId={clinicData.clinic_id} />}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClinicDashboard;
