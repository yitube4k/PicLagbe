import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toBn, bnDate } from '../lib/utils';

type ChatRole = 'customer' | 'photographer';

type ConversationRow = {
  id: string;
  customer_id: string;
  photographer_id: string;
  last_message_at: string;
  created_at: string;
  customers?: { full_name?: string | null; avatar_url?: string | null } | null;
  photographers?: { display_name?: string | null; profile_photo_url?: string | null } | null;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export default function ChatPage() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const activeId = params.get('c');

  const [role, setRole] = useState<ChatRole>('customer');
  const [photographerProfileId, setPhotographerProfileId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Resolve role: photographer (has photographers row) or customer
  useEffect(() => {
    if (!session) {
      navigate('/auth');
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('photographers')
        .select('id')
        .eq('user_id', session!.user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setRole('photographer');
        setPhotographerProfileId((data as { id: string }).id);
      } else {
        setRole('customer');
      }
    })();
    return () => {
      active = false;
    };
  }, [session, navigate]);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    let q = supabase
      .from('conversations')
      .select('*, customers:customer_id(full_name, avatar_url), photographers:photographer_id(display_name, profile_photo_url)')
      .order('last_message_at', { ascending: false });

    if (role === 'photographer' && photographerProfileId) {
      q = q.eq('photographer_id', photographerProfileId);
    } else if (role === 'customer') {
      q = q.eq('customer_id', session.user.id);
    }

    const { data, error } = await q;
    if (!error && data) setConversations(data as ConversationRow[]);
    setLoading(false);
  }, [session, role, photographerProfileId]);

  useEffect(() => {
    if (role === 'photographer' && !photographerProfileId) return;
    loadConversations();
  }, [role, photographerProfileId, loadConversations]);

  // Live conversation-list refresh (any new message bumps list ordering)
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel('chat-list-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadConversations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session, loadConversations]);

  // Load messages for active conversation + realtime thread
  useEffect(() => {
    if (!activeId) return;
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeId)
        .order('created_at', { ascending: true });
      if (active && !error && data) {
        setMessages(data as ChatMessage[]);
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        // mark unread as read (own view)
        const unread = (data as ChatMessage[]).filter((m) => !m.read_at && m.sender_id !== session?.user.id);
        if (unread.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unread.map((m) => m.id));
        }
      }
    })();

    const channel = supabase
      .channel(`chat-thread-${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          if (m.sender_id !== session?.user.id) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [activeId, session]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session || sending || !activeId) return;
    setSending(true);
    const body = input.trim();
    setInput('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeId,
      sender_id: session.user.id,
      body,
    });

    if (error) {
      alert('মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।');
      setInput(body);
    } else {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeId);
    }
    setSending(false);
  };

  if (!session) return null;

  const peerName = (c: ConversationRow) =>
    role === 'customer'
      ? c.photographers?.display_name || 'ফটোগ্রাফার'
      : c.customers?.full_name || 'গ্রাহক';
  const peerAvatar = (c: ConversationRow) =>
    role === 'customer' ? c.photographers?.profile_photo_url : c.customers?.avatar_url;

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold grad-text">মেসেজ</h1>
          <p className="text-sm text-white/55 mt-1">
            {role === 'photographer' ? 'গ্রাহকদের সাথে সরাসরি কথা বলুন' : 'ফটোগ্রাফারদের সাথে সরাসরি কথা বলুন'}
          </p>
        </div>
        <span className="chip cursor-default">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          লাইভ চ্যাট
        </span>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        {/* LEFT: Conversation list */}
        <div className={`glass-card rounded-xl3 overflow-hidden ${activeId ? 'hidden lg:block' : ''}`}>
          <div className="px-5 py-4 border-b border-white/[0.08]">
            <h2 className="text-sm font-bold text-white/80">কথোপকথন ({toBn(conversations.length)})</h2>
          </div>
          <div className="max-h-[60vh] lg:max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-xl2" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto glass rounded-full flex items-center justify-center text-white/60">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-white/55">এখনও কোনো কথোপকথন নেই।</p>
                {role === 'customer' && (
                  <Link to="/photographers" className="btn-ghost !text-xs !py-2">
                    ফটোগ্রাফার খুঁজুন
                  </Link>
                )}
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/chat?c=${c.id}`)}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition border-b border-white/[0.05] ${
                    c.id === activeId ? 'bg-sunset-soft' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  {peerAvatar(c) ? (
                    <img src={peerAvatar(c)!} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-sunset-gold/35 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sunset-gradient flex items-center justify-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                      {peerName(c).slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white truncate">{peerName(c)}</span>
                      <span className="text-[11.5px] text-white/40 shrink-0">{bnDate(c.last_message_at)}</span>
                    </div>
                    <span className="text-xs text-white/50 block truncate">
                      {role === 'customer' ? 'ফটোগ্রাফার' : 'গ্রাহক'} · {c.created_at.slice(0, 10)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Thread */}
        <div className={`glass-card rounded-xl3 flex flex-col ${activeId ? '' : 'hidden lg:flex'}`}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3 min-h-[50vh]">
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-white/50">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <p className="text-white/70 font-semibold">একটি কথোপকথন বেছে নিন</p>
              <p className="text-sm text-white/50 max-w-xs">
                বাম দিকের লিস্ট থেকে যে কারো সাথে চ্যাট শুরু করুন। মেসেজ তাৎক্ষণিক ডেলিভার হয়।
              </p>
              {activeId === null && conversations.length > 0 && (
                <button type="button" onClick={() => navigate(`/chat?c=${conversations[0].id}`)} className="btn-ghost !text-xs mt-2">
                  সর্বশেষ কথোপকথন খুলুন →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  aria-label="তালিকায় ফিরুন"
                  className="lg:hidden glass rounded-lg p-1.5 text-white/70"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                {activeConv && (
                  <>
                    {peerAvatar(activeConv) ? (
                      <img src={peerAvatar(activeConv)!} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-sunset-gold/35" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sunset-gradient flex items-center justify-center text-xs font-extrabold text-[#1A0E06]">
                        {peerName(activeConv).slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white truncate block">{peerName(activeConv)}</span>
                      <span className="text-[12.5px] text-white/45">
                        {role === 'customer' ? 'ভেরিফায়েড ফটোগ্রাফার' : 'সম্মানিত গ্রাহক'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[52vh] lg:max-h-[58vh]">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-white/45 py-10">
                    কোনো মেসেজ নেই — প্রথম মেসেজটি পাঠান!
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === session.user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            mine
                              ? 'bg-sunset-gradient text-[#1A0E06] font-medium rounded-br-md'
                              : 'glass text-white/90 rounded-bl-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <span className={`text-[11.5px] mt-1 block ${mine ? 'text-[#1A0E06]/60' : 'text-white/40'}`}>
                            {bnDate(m.created_at)}
                            {mine && (m.read_at ? ' · পড়া হয়েছে' : ' · পাঠানো হয়েছে')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} className="p-4 border-t border-white/[0.08] flex gap-2.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="মেসেজ লিখুন…"
                  aria-label="মেসেজ লিখুন"
                  className="glass-input flex-1 !bg-white/5 min-h-[44px]"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="মেসেজ পাঠান"
                  className="btn-primary !px-4 min-h-[44px]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
