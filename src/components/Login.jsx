import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { PetPalsBrand } from '@petpals/theme/PetPalsLogo.jsx'
import ThemeToggle from '@petpals/theme/ThemeToggle.jsx';
import { Stethoscope, Mail, ShieldCheck, ArrowLeft, Sparkles } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else if (data.user) {
            onLoginSuccess(data.user);
        }
        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
        if (error) {
            setError(error.message);
        } else {
            setResetSent(true);
        }
        setResetLoading(false);
    };

    return (
        <div
            className="relative flex min-h-screen overflow-hidden"
            style={{ background: '#F0F4F8', color: 'var(--pp-text-primary)' }}
        >
            {/* Theme toggle */}
            <div className="absolute right-5 top-5 z-20">
                <ThemeToggle />
            </div>

            {/* ── Left brand panel ── */}
            <div
                className="hidden lg:flex w-1/2 flex-col p-12 xl:p-16 relative"
                style={{ borderRight: '1px solid #E5E7EB' }}
            >
                {/* Decorative gradient blobs */}
                <div
                    aria-hidden
                    style={{
                        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
                        background: 'linear-gradient(135deg, #E8E4F8 0%, #D4E8F8 60%, #F0F4F8 100%)',
                        opacity: 0.6,
                    }}
                />

                <div className="relative z-10 flex items-center gap-3">
                    <PetPalsBrand logoSize="md" subtitle="Clinic portal" />
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg mt-12">
                    <div
                        className="mb-6 inline-flex w-fit items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
                        style={{
                            borderRadius: 99, border: '1px solid rgba(94,196,240,0.35)',
                            background: 'rgba(94,196,240,0.1)', color: '#0369A1',
                        }}
                    >
                        <Sparkles size={13} />
                        Veterinary OS
                    </div>
                    <h2 className="text-4xl font-black leading-tight mb-6" style={{ color: '#1A1A2E' }}>
                        The intelligent operating system for{' '}
                        <span style={{ background: 'linear-gradient(135deg,#5EC4F0,#3078A4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            modern clinics
                        </span>
                    </h2>
                    <ul className="space-y-5" style={{ color: '#4B5563' }}>
                        <li className="flex items-start gap-4">
                            <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                style={{ background: 'rgba(94,196,240,0.12)', color: '#0369A1' }}
                            >
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <span>
                                <strong style={{ color: '#1A1A2E' }}>Secure records.</strong>{' '}
                                Encrypted patient and clinic data.
                            </span>
                        </li>
                        <li className="flex items-start gap-4">
                            <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                style={{ background: 'rgba(94,196,240,0.12)', color: '#0369A1' }}
                            >
                                <Stethoscope className="w-4 h-4" />
                            </div>
                            <span>
                                <strong style={{ color: '#1A1A2E' }}>Seamless care.</strong>{' '}
                                Appointments, billing, and history in one place.
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ── Right auth card panel ── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative z-10">
                <div
                    className="w-full max-w-md"
                    style={{
                        background: '#FFFFFF',
                        borderRadius: 24,
                        border: '1px solid #F3F4F6',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                        padding: '40px',
                    }}
                >
                    {!showReset ? (
                        <>
                            <div className="mb-8 text-center lg:text-left">
                                <h2 className="text-2xl font-bold mb-1.5" style={{ color: '#1A1A2E' }}>
                                    Welcome back
                                </h2>
                                <p style={{ color: '#6B7280', fontSize: 14 }}>
                                    Sign in to your clinic portal to continue.
                                </p>
                            </div>

                            {error && (
                                <div
                                    className="flex items-center gap-3 p-4 text-sm mb-6"
                                    style={{
                                        background: '#FEF2F2', color: '#991B1B',
                                        border: '1px solid #FECACA', borderRadius: 12,
                                    }}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label
                                        className="block mb-2 text-xs font-bold uppercase tracking-wider"
                                        style={{ color: '#6B7280' }}
                                    >
                                        Work email
                                    </label>
                                    <div className="relative">
                                        <Mail
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                            style={{ color: '#9CA3AF' }}
                                        />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="doctor@clinic.com"
                                            style={{
                                                width: '100%', padding: '11px 14px 11px 38px',
                                                borderRadius: 12, border: '1.5px solid #E5E7EB',
                                                background: '#F9FAFB', fontSize: 14,
                                                color: '#1A1A2E', outline: 'none',
                                                transition: 'border-color 0.15s, box-shadow 0.15s',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={e => {
                                                e.target.style.borderColor = '#5EC4F0';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(94,196,240,0.15)';
                                            }}
                                            onBlur={e => {
                                                e.target.style.borderColor = '#E5E7EB';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        className="block mb-2 text-xs font-bold uppercase tracking-wider"
                                        style={{ color: '#6B7280' }}
                                    >
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%', padding: '11px 14px',
                                            borderRadius: 12, border: '1.5px solid #E5E7EB',
                                            background: '#F9FAFB', fontSize: 14,
                                            color: '#1A1A2E', outline: 'none',
                                            transition: 'border-color 0.15s, box-shadow 0.15s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={e => {
                                            e.target.style.borderColor = '#5EC4F0';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(94,196,240,0.15)';
                                        }}
                                        onBlur={e => {
                                            e.target.style.borderColor = '#E5E7EB';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setShowReset(true); setResetEmail(email); setError(null); }}
                                        style={{ fontSize: 13, fontWeight: 600, color: '#0369A1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '13px',
                                        borderRadius: 99,
                                        border: 'none',
                                        background: loading ? '#9CA3AF' : 'linear-gradient(135deg,#5EC4F0 0%,#3078A4 100%)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: 15,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'filter 0.2s, transform 0.15s',
                                        boxShadow: '0 4px 14px rgba(94,196,240,0.35)',
                                    }}
                                >
                                    {loading ? 'Authenticating…' : 'Sign in →'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => { setShowReset(false); setResetSent(false); setError(null); }}
                                className="flex items-center gap-2 mb-6 text-sm font-semibold"
                                style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to sign in
                            </button>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-1.5" style={{ color: '#1A1A2E' }}>
                                    Reset password
                                </h2>
                                <p style={{ color: '#6B7280', fontSize: 14 }}>
                                    Enter your work email and we&apos;ll send a reset link.
                                </p>
                            </div>

                            {error && (
                                <div
                                    className="p-4 text-sm mb-6"
                                    style={{
                                        background: '#FEF2F2', color: '#991B1B',
                                        border: '1px solid #FECACA', borderRadius: 12,
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            {resetSent ? (
                                <div
                                    className="p-5 font-semibold text-sm"
                                    style={{
                                        background: '#ECFDF5', color: '#065F46',
                                        border: '1px solid #A7F3D0', borderRadius: 12,
                                    }}
                                >
                                    ✓ Reset link sent to <strong>{resetEmail}</strong>. Check your inbox.
                                </div>
                            ) : (
                                <form onSubmit={handleResetPassword} className="space-y-5">
                                    <div>
                                        <label
                                            className="block mb-2 text-xs font-bold uppercase tracking-wider"
                                            style={{ color: '#6B7280' }}
                                        >
                                            Work email
                                        </label>
                                        <div className="relative">
                                            <Mail
                                                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                                style={{ color: '#9CA3AF' }}
                                            />
                                            <input
                                                type="email"
                                                required
                                                value={resetEmail}
                                                onChange={(e) => setResetEmail(e.target.value)}
                                                placeholder="doctor@clinic.com"
                                                style={{
                                                    width: '100%', padding: '11px 14px 11px 38px',
                                                    borderRadius: 12, border: '1.5px solid #E5E7EB',
                                                    background: '#F9FAFB', fontSize: 14,
                                                    color: '#1A1A2E', outline: 'none',
                                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                                    boxSizing: 'border-box',
                                                }}
                                                onFocus={e => {
                                                    e.target.style.borderColor = '#5EC4F0';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(94,196,240,0.15)';
                                                }}
                                                onBlur={e => {
                                                    e.target.style.borderColor = '#E5E7EB';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        style={{
                                            width: '100%',
                                            padding: '13px',
                                            borderRadius: 99,
                                            border: 'none',
                                            background: resetLoading ? '#9CA3AF' : 'linear-gradient(135deg,#5EC4F0 0%,#3078A4 100%)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: 15,
                                            cursor: resetLoading ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 14px rgba(94,196,240,0.35)',
                                        }}
                                    >
                                        {resetLoading ? 'Sending…' : 'Send reset link'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
