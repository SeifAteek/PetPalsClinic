import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PetPalsBrand } from '@petpals/theme/PetPalsLogo.jsx'
import MeshBackground from '@petpals/theme/MeshBackground.jsx';
import ThemeToggle from '@petpals/theme/ThemeToggle.jsx';
import {
    Calendar, Clock, LayoutDashboard, HeartPulse,
    MessageSquare, PackageSearch, Receipt, TrendingUp,
    Settings as SettingsIcon, Users, LogOut, Loader2,
    ClipboardList, Stethoscope, ChevronLeft, ChevronRight as ChevronRightIcon
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

/* ── Sky-blue brand colour (no gradients) ─────────────────────────── */
const SKY  = '#5EC4F0';
const NAVY = '#1A1A2E';
const BG   = '#F0F4F8';

const navigation = [
    { id: 'appointments', label: 'Appointments',        icon: Clock },
    { id: 'services',     label: 'Clinic Services',     icon: ClipboardList },
    { id: 'calendar',     label: 'Visual Schedule',     icon: Calendar },
    { id: 'history',      label: 'Appt. History',       icon: LayoutDashboard },
    { id: 'intake',       label: 'Patient Intake',      icon: Users },
    { id: 'records',      label: 'Health Records',      icon: HeartPulse },
    { id: 'chat',         label: 'Client Chat',         icon: MessageSquare },
    { id: 'inventory',    label: 'Inventory',           icon: PackageSearch },
    { id: 'billing',      label: 'Billing & Invoices',  icon: Receipt },
    { id: 'analytics',    label: 'Analytics',           icon: TrendingUp },
    { id: 'staff',        label: 'Staff',               icon: Users },
    { id: 'settings',     label: 'Settings',            icon: SettingsIcon },
];

/* ── Sidebar styles ─────────────────────────────────────────────────── */
const sidebarBase = {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    background: '#FFFFFF',
    borderRight: '1px solid #E5E7EB',
    boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'width 0.2s ease',
};

const SIDEBAR_W_EXPANDED = 220;
const SIDEBAR_W_COLLAPSED = 64;

const ClinicDashboard = () => {
    const [session,          setSession]          = useState(null);
    const [clinicData,       setClinicData]       = useState(null);
    const [activeTab,        setActiveTab]        = useState('appointments');
    const [isInitializing,   setIsInitializing]   = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const sidebarW = sidebarCollapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

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
        const { data } = await supabase.from('clinics').select('*').eq('owner_id', userId).single();
        if (data) setClinicData(data);
        setIsInitializing(false);
    };

    const handleLogout = async () => { await supabase.auth.signOut(); };

    /* ── loading ── */
    if (isInitializing) {
        return (
            <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: 40, height: 40, color: SKY, animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                <p style={{ color: '#6B7280', fontWeight: 500 }}>Initialising workspace…</p>
            </div>
        );
    }

    if (!session) return <Login onLoginSuccess={(user) => fetchClinicProfile(user.id)} />;

    if (session && !clinicData) {
        return (
            <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #F3F4F6', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 40, maxWidth: 400, width: '100%', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: SKY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Stethoscope style={{ width: 32, height: 32, color: '#fff' }} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Welcome to PetPals</h2>
                    <p style={{ color: '#6B7280', marginBottom: 24 }}>Your account is active but no clinic profile was found. Contact support or log out and try again.</p>
                    <button onClick={handleLogout} style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 20px', fontWeight: 600, color: NAVY, cursor: 'pointer', width: '100%' }}>
                        Sign out
                    </button>
                </div>
            </div>
        );
    }

    const currentTab = navigation.find(n => n.id === activeTab) || navigation[0];

    /* ── Calendar tab: full-viewport layout, no hero banner ── */
    const isCalendar = activeTab === 'calendar';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
            <MeshBackground />

            {/* ══════════════ SIDEBAR ══════════════ */}
            <aside
                style={{ ...sidebarBase, width: sidebarW }}
                aria-label="Main navigation"
            >
                {/* Logo row */}
                <div style={{ padding: sidebarCollapsed ? '20px 0' : '20px 16px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
                    {!sidebarCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                            <PetPalsBrand logoSize="sm" />
                        </div>
                    )}
                    {sidebarCollapsed && (
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: SKY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Stethoscope style={{ width: 18, height: 18, color: '#fff' }} />
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(c => !c)}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: sidebarCollapsed ? 0 : 'auto', color: '#6B7280' }}
                    >
                        {sidebarCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }} role="navigation">
                    {navigation.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                title={sidebarCollapsed ? item.label : undefined}
                                aria-current={isActive ? 'page' : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                    borderRadius: 10,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s, color 0.12s',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: 13,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    background: isActive ? SKY : 'transparent',
                                    color:      isActive ? '#FFFFFF' : '#4B5563',
                                    width: '100%',
                                    textAlign: 'left',
                                    outline: 'none',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F0F4F8'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                onFocus={e => { if (!isActive) e.currentTarget.style.background = '#F0F4F8'; }}
                                onBlur={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <item.icon
                                    style={{
                                        width: 18, height: 18,
                                        flexShrink: 0,
                                        color: isActive ? '#FFFFFF' : '#5EC4F0',
                                    }}
                                    aria-hidden="true"
                                />
                                {!sidebarCollapsed && (
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom: theme toggle + logout */}
                <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {!sidebarCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                            <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, flex: 1 }}>Theme</span>
                            <ThemeToggle />
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        aria-label="Sign out"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                            borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: 'transparent', color: '#EF4444',
                            fontSize: 13, fontWeight: 600, width: '100%',
                            transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden="true" />
                        {!sidebarCollapsed && <span>Sign out</span>}
                    </button>
                </div>
            </aside>

            {/* ══════════════ MAIN AREA ══════════════ */}
            <div
                style={{
                    marginLeft: sidebarW,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    position: 'relative',
                    zIndex: 10,
                    transition: 'margin-left 0.2s ease',
                    minHeight: '100vh',
                }}
            >
                {/* Top bar */}
                <header
                    role="banner"
                    style={{
                        position: 'sticky', top: 0, zIndex: 30,
                        height: 60, minHeight: 60,
                        background: '#FFFFFF',
                        borderBottom: '1px solid #F3F4F6',
                        display: 'flex', alignItems: 'center',
                        padding: '0 24px', gap: 14,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                >
                    <currentTab.icon style={{ width: 18, height: 18, color: SKY, flexShrink: 0 }} aria-hidden="true" />
                    <h1
                        style={{ fontSize: 15, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap', margin: 0 }}
                        id="page-title"
                    >
                        {currentTab.label}
                    </h1>
                    <div style={{ flex: 1 }} />
                    <span
                        style={{ fontSize: 11, fontWeight: 700, background: '#E0F2FE', color: '#0369A1', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.03em' }}
                        aria-label="Clinic is live"
                    >
                        LIVE
                    </span>
                    {/* Clinic avatar */}
                    <div
                        title={clinicData.name}
                        aria-label={`Clinic: ${clinicData.name}`}
                        style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: SKY,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
                        }}
                    >
                        {clinicData.name.charAt(0).toUpperCase()}
                    </div>
                </header>

                {/* Hero bar — skip for calendar to give it maximum space */}
                {!isCalendar && (
                    <div
                        role="region"
                        aria-label="Clinic hero"
                        style={{
                            background: SKY,
                            padding: '20px 28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                        }}
                    >
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', margin: 0 }}>
                                PetPals Clinic
                            </p>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: '4px 0 2px' }}>
                                {clinicData.name}
                            </h2>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                                {currentTab.label}
                            </p>
                        </div>
                        <HeartPulse style={{ width: 56, height: 56, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} aria-hidden="true" />
                    </div>
                )}

                {/* Scrollable content */}
                <main
                    id="main-content"
                    aria-labelledby="page-title"
                    style={{
                        flex: 1,
                        padding: isCalendar ? 0 : 28,
                        overflow: isCalendar ? 'hidden' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        /* Calendar needs explicit height so FullCalendar can fill 100% */
                        ...(isCalendar ? { height: 'calc(100vh - 60px)' } : {}),
                    }}
                >
                    {activeTab === 'appointments' && <Appointments clinicId={clinicData.clinic_id} clinicData={clinicData} />}
                    {activeTab === 'services'     && <ClinicServices clinicId={clinicData.clinic_id} />}
                    {activeTab === 'calendar'     && <CalendarView clinicId={clinicData.clinic_id} />}
                    {activeTab === 'history'      && <AppointmentHistory clinicId={clinicData.clinic_id} />}
                    {activeTab === 'intake'       && <PatientIntake clinicId={clinicData.clinic_id} />}
                    {activeTab === 'records'      && <HealthRecords clinicId={clinicData.clinic_id} />}
                    {activeTab === 'chat'         && <ClientChat clinicId={clinicData.clinic_id} />}
                    {activeTab === 'inventory'    && <Inventory clinicId={clinicData.clinic_id} />}
                    {activeTab === 'billing'      && <Billing clinicId={clinicData.clinic_id} clinicData={clinicData} />}
                    {activeTab === 'analytics'    && <Analytics clinicId={clinicData.clinic_id} />}
                    {activeTab === 'staff'        && <StaffManagement clinicId={clinicData.clinic_id} />}
                    {activeTab === 'settings'     && <Settings clinicData={clinicData} setClinicData={setClinicData} />}
                </main>
            </div>
        </div>
    );
};

export default ClinicDashboard;
