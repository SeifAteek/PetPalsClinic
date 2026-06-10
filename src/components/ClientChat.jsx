import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Send, UserCircle2, Info, Search, MessageSquare } from 'lucide-react';

const ClientChat = ({ clinicId }) => {
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [activeClient, setActiveClient] = useState(null);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    // Function to fetch clients
    const fetchClients = async () => {
        if (!clinicId) return;
        
        // 1. Get clients from appointments
        const { data: aptData, error: aptError } = await supabase
            .from('appointments')
            .select(`profiles!appointments_user_id_fkey (user_id, user_name)`)
            .eq('clinic_id', clinicId);

        // 2. Get clients from messages AND their most recent message time
        const { data: msgsData, error: msgsError } = await supabase
            .from('messages')
            .select('client_id, created_at')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false });

        const uniqueClientsMap = new Map();

        // Track the latest message time for each client
        const latestMessageTimeMap = new Map();
        if (!msgsError && msgsData) {
            msgsData.forEach(msg => {
                if (!latestMessageTimeMap.has(msg.client_id)) {
                    latestMessageTimeMap.set(msg.client_id, msg.created_at);
                }
            });
        }

        // Process appointment clients
        if (!aptError && aptData) {
            aptData.forEach(apt => {
                const profile = apt.profiles;
                if (profile && !uniqueClientsMap.has(profile.user_id)) {
                    uniqueClientsMap.set(profile.user_id, {
                        user_id: profile.user_id,
                        user_name: profile.user_name,
                        last_message_at: latestMessageTimeMap.get(profile.user_id) || '1970-01-01'
                    });
                }
            });
        }

        // Process message-only clients
        if (!msgsError && msgsData) {
            const uniqueMsgUserIds = [...new Set(msgsData.map(m => m.client_id))].filter(id => !uniqueClientsMap.has(id));
            if (uniqueMsgUserIds.length > 0) {
                const { data: profData } = await supabase
                    .from('profiles')
                    .select('user_id, user_name')
                    .in('user_id', uniqueMsgUserIds);
                
                if (profData) {
                    profData.forEach(p => {
                        uniqueClientsMap.set(p.user_id, {
                            user_id: p.user_id,
                            user_name: p.user_name,
                            last_message_at: latestMessageTimeMap.get(p.user_id)
                        });
                    });
                }
            }
        }
        
        // Sort by most recent message first, then alphabetically
        const sortedProfiles = Array.from(uniqueClientsMap.values());
        sortedProfiles.sort((a, b) => {
            const timeA = new Date(a.last_message_at).getTime();
            const timeB = new Date(b.last_message_at).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (a.user_name || '').localeCompare(b.user_name || '');
        });
        
        setClients(sortedProfiles);
        setFilteredClients(sortedProfiles);
        
        // Preserve selection or auto-select top one
        if (sortedProfiles.length > 0 && !activeClient) {
            setActiveClient(sortedProfiles[0]);
        }
    };

    useEffect(() => {
        fetchClients();

        // Global listener: Refresh sidebar on new messages
        const sidebarChannel = supabase
            .channel(`clinic-sidebar-${clinicId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `clinic_id=eq.${clinicId}` 
            }, () => {
                fetchClients();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sidebarChannel);
        };
    }, [clinicId]);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredClients(clients);
            return;
        }
        const lowerQ = searchQuery.toLowerCase();
        setFilteredClients(clients.filter(c => c.user_name && c.user_name.toLowerCase().includes(lowerQ)));
    }, [searchQuery, clients]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeClient || !clinicId) return;
            setIsLoadingMessages(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('client_id', activeClient.user_id)
                .order('created_at', { ascending: true });

            if (!error) {
                setMessages(data || []);
            }
            setIsLoadingMessages(false);
        };
        fetchMessages();

        // Active chat listener
        const chatChannel = supabase
            .channel(`clinic-chat-${activeClient?.user_id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `clinic_id=eq.${clinicId}` 
            }, (payload) => {
                const newMessage = payload.new;
                if (newMessage.client_id === activeClient?.user_id) {
                    setMessages(prev => {
                        if (prev.some(m => m.message_id === newMessage.message_id)) return prev;
                        return [...prev, newMessage];
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(chatChannel);
        };
    }, [activeClient, clinicId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeClient || !clinicId) return;

        const newMessageText = chatInput;
        setChatInput('');

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                clinic_id: clinicId,
                client_id: activeClient.user_id,
                text: newMessageText,
                sender: 'Clinic'
            }])
            .select();

        if (!error && data) {
            setMessages(prev => [...prev, data[0]]);
        }
    };

    return (
        <div className="flex h-full bg-white/5 rounded-2xl shadow-sm border border-white/10 overflow-hidden">
            {/* Sidebar: Client List */}
            <div className="w-1/3 max-w-sm border-r border-white/10 bg-white/5/5 flex flex-col">
                <div className="p-5 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Messages</h3>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 clinic-card border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">
                            {searchQuery ? 'No matching clients found.' : 'No clients found.'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredClients.map(client => (
                                <div
                                    key={client.user_id}
                                    onClick={() => setActiveClient(client)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                                        activeClient?.user_id === client.user_id
                                            ? 'bg-brand-500/10 border border-brand-100 shadow-sm'
                                            : 'hover:bg-white/5/10 border border-transparent'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeClient?.user_id === client.user_id ? 'bg-brand-500/100/20 text-brand-400' : 'bg-white/5/10 text-slate-500'}`}>
                                        <UserCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className={`font-semibold truncate text-sm ${activeClient?.user_id === client.user_id ? 'text-brand-900' : 'text-slate-200'}`}>
                                            {client.user_name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">Tap to open chat</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area: Chat Window */}
            <div className="flex-1 flex flex-col bg-white/5">
                {activeClient ? (
                    <>
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 z-10 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/5/10 text-slate-500 rounded-full flex items-center justify-center">
                                    <UserCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white leading-tight">{activeClient.user_name}</h3>
                                    <p className="text-xs font-medium text-brand-400 flex items-center gap-1"><Info className="w-3 h-3"/> Active Client</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-white/5/5 relative">
                            {isLoadingMessages ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/5/5/50 backdrop-blur-[1px]">
                                    <div className="animate-spin w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                                    <MessageSquare className="w-12 h-12 text-slate-300" />
                                    <p className="text-sm font-medium">No messages yet. Send a greeting to {activeClient.user_name}!</p>
                                </div>
                            ) : (
                                messages.map((msg, i) => {
                                    const isClinic = msg.sender === 'Clinic';
                                    const showTime = true;
                                    return (
                                        <div key={msg.message_id || i} className={`flex ${isClinic ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] sm:max-w-md flex flex-col ${isClinic ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-5 py-3 shadow-sm text-sm ${
                                                    isClinic
                                                        ? 'bg-brand-600 text-white rounded-2xl rounded-tr-sm'
                                                        : 'clinic-card border-white/10 text-slate-100 rounded-2xl rounded-tl-sm'
                                                }`}>
                                                    <p className="leading-relaxed">{msg.text}</p>
                                                </div>
                                                {showTime && (
                                                    <p className="text-[10px] font-medium text-slate-400 mt-1.5 px-1">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} className="h-1" />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={`Message ${activeClient.user_name}...`}
                                    className="w-full pl-5 pr-14 py-3.5 bg-white/5/5 border border-white/10 rounded-full text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white/5 transition-all shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4 -mr-0.5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white/5/5 text-slate-400">
                        <MessageSquare className="w-16 h-16 mb-4 text-slate-200" />
                        <p className="font-semibold text-slate-500">Select a client conversation to begin</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientChat;