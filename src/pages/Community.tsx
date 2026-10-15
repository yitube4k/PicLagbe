import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CommunityMessage } from '../lib/types';
import { toBn } from '../lib/utils';

export default function Community() {
  const { session, profile } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let active = true;

    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from('community_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!active) return;

        if (error) {
          console.error('Community messages fetch error:', error);
        } else if (data) {
          setMessages((data as CommunityMessage[]).reverse());
        }
      } catch (err) {
        if (active) {
          console.error('Community messages load error:', err);
        }
      } finally {
        if (active) {
          setLoading(false);
          scrollToBottom();
        }
      }
    }

    loadMessages();

    // Realtime Subscription
    const channel = supabase
      .channel('community_v9')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          const newMsg = payload.new as CommunityMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !session || !profile || sending) return;

    const messageBody = text.trim();
    setText('');
    setSending(true);

    try {
      const { error } = await supabase.from('community_messages').insert({
        user_id: profile.id,
        display_name: profile.full_name || 'কমিউনিটি সদস্য',
        avatar_url: profile.avatar_url || null,
        body: messageBody,
      });

      if (error) {
        console.error('Message send error:', error);
        setText(messageBody); // restore on failure
      }
    } catch (err) {
      console.error('Send error:', err);
      setText(messageBody);
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return 'ফ';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 pt-24 pb-28">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="section-head">💬 কমিউনিটি চ্যাট</h2>
          <p className="section-sub mt-1">
            কক্সবাজার ভ্রমণ, ফটোশুট টিপস, ফটোগ্রাফার রিকমেন্ডেশন — সবাই মিলে আলোচনা
          </p>
        </div>
        <div className="badge flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border-emerald-400/35">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>লাইভ</span>
        </div>
      </div>

      {/* Chat Window */}
      <div className="glass rounded-xl3 overflow-hidden shadow-glass-lg border border-white/[0.12]">
        {/* Top Bar */}
        <div className="bg-white/[0.04] border-b border-white/[0.08] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 glass rounded-xl2 flex items-center justify-center text-base shrink-0">
              🌊
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">ফটোলাগবে কমিউনিটি</h3>
              <p className="text-xs text-white/50">{toBn(messages.length)} মেসেজ</p>
            </div>
          </div>
          <span className="chip !text-[11px] !py-1 pointer-events-none">
            নিয়ম মেনে চ্যাট করুন
          </span>
        </div>

        {/* Messages Area */}
        <div className="h-[55vh] overflow-y-auto no-scrollbar p-4 lg:p-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`skeleton h-14 w-3/4 rounded-xl2 ${i % 2 === 0 ? 'ml-auto' : ''}`}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="glass-card p-8 rounded-xl3 text-center my-12 max-w-sm mx-auto">
              <p className="text-lg font-bold text-white mb-1">👋 প্রথম মেসেজটি আপনিই দিন!</p>
              <p className="text-sm text-white/50">
                কক্সবাজারের শ্যুট অভিজ্ঞতা বা কোনো প্রশ্ন থাকলে এখানে শেয়ার করুন।
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = profile && msg.user_id === profile.id;
              const senderName = isOwn ? 'আপনি' : msg.display_name || 'সদস্য';

              return (
                <div
                  key={msg.id || `${msg.created_at}-${Math.random()}`}
                  className={`flex gap-3 items-end ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  {msg.avatar_url ? (
                    <img
                      src={msg.avatar_url}
                      alt={senderName}
                      className="w-[38px] h-[38px] rounded-full object-cover ring-1 ring-sunset-gold/45 shrink-0"
                    />
                  ) : (
                    <div className="w-[38px] h-[38px] rounded-full bg-sunset-gradient flex items-center justify-center text-xs font-bold text-[#1A0E06] shrink-0">
                      {getInitials(senderName)}
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div className={`max-w-[78%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-white/55">
                        {senderName}
                      </span>
                      <span className="text-[10px] text-white/35">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>

                    <div
                      className={`px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap shadow-glass-sm ${
                        isOwn
                          ? 'bg-sunset-gradient text-[#1A0E06] font-medium rounded-2xl rounded-br-md'
                          : 'glass rounded-2xl rounded-bl-md text-white/90 border border-white/[0.1]'
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.03]">
          {!session ? (
            <div className="glass-card p-4 rounded-xl2 text-center space-y-3">
              <p className="text-sm text-white/80">কমিউনিটি চ্যাটে অংশ নিতে লগইন করুন</p>
              <Link to="/auth?mode=login" className="btn-primary inline-flex px-6 py-2.5 text-sm">
                লগইন করুন
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-3 items-center relative">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  placeholder="মেসেজ লিখুন…"
                  className="glass-input !py-3 pr-16"
                />
                {text.length > 800 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/40">
                    {toBn(1000 - text.length)}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!text.trim() || sending}
                aria-label="মেসেজ পাঠান"
                className="btn-primary shrink-0 px-5 py-3"
              >
                {sending ? (
                  <span>⏳</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
