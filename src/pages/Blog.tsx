import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BlogPost } from '../lib/types';
import { toBn, bnDate } from '../lib/utils';
import Reveal from '../components/Reveal';

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false });

        if (!active) return;

        if (error) {
          console.error('Blog posts fetch error:', error);
        } else {
          setPosts((data as BlogPost[]) || []);
        }
      } catch (err) {
        if (active) {
          console.error('Blog posts load error:', err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      active = false;
    };
  }, []);

  const getReadTime = (content?: string | null) => {
    if (!content) return 1;
    return Math.ceil(content.length / 800);
  };

  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
      {/* Header */}
      <div className="mb-12">
        <h2 className="section-head">📚 ফটোগ্রাফি ব্লগ</h2>
        <p className="section-sub mt-1">
          কক্সবাজার গাইড, শুট টিপস, লোকেশন সিক্রেট — প্রতি সপ্তাহে নতুন
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="skeleton h-80 rounded-xl3 w-full" />
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-72 rounded-xl3" />
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-xl3 max-w-lg mx-auto">
          <h3 className="text-xl font-bold text-white mb-2">শীঘ্রই নতুন আর্টিকেল আসছে</h3>
          <p className="text-sm text-white/60">
            আমাদের টিম কক্সবাজারের সেরা ফটোগ্রাফি টিপস ও গাইড তৈরি করছে।
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Featured Post */}
          {featuredPost && (
            <Reveal>
              <Link
                to={`/blog/${featuredPost.slug}`}
                className="glass-card overflow-hidden grid md:grid-cols-2 rounded-xl3 group block"
              >
                <div className="relative h-full min-h-[280px] bg-twilight-800 overflow-hidden">
                  {featuredPost.cover_url ? (
                    <img
                      src={featuredPost.cover_url}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-sunset-soft" />
                  )}
                </div>

                <div className="p-8 flex flex-col justify-between">
                  <div>
                    <span className="badge bg-sunset-gradient text-[#1A0E06] font-bold">
                      🌟 ফিচার্ড
                    </span>
                    <h3 className="text-2xl font-extrabold text-white group-hover:text-sunset-gold transition mt-3 leading-tight">
                      {featuredPost.title}
                    </h3>
                    <p className="text-white/65 mt-3 line-clamp-3 text-sm sm:text-base leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/50 pt-6 mt-6 border-t border-white/[0.08]">
                    <span>{bnDate(featuredPost.created_at)}</span>
                    <span>⏱ {toBn(getReadTime(featuredPost.content))} মিনিট পড়া</span>
                    <span>{featuredPost.author || 'ফটোলাগবে টিম'}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          )}

          {/* Grid Posts */}
          {gridPosts.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridPosts.map((post, i) => {
                const readMin = getReadTime(post.content);
                const tags = post.tags || [];

                return (
                  <Reveal key={post.id} delay={i * 60}>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="glass-card overflow-hidden flex flex-col rounded-xl3 group h-full"
                    >
                      <div className="relative h-44 w-full bg-twilight-800 overflow-hidden">
                        {post.cover_url ? (
                          <img
                            src={post.cover_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-sunset-soft" />
                        )}
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {tags.slice(0, 2).map((t, tIdx) => (
                                <span key={tIdx} className="chip !text-[10px] !py-0.5 !px-2">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <h4 className="font-bold text-white text-base group-hover:text-sunset-gold transition line-clamp-2 leading-snug">
                            {post.title}
                          </h4>
                          <p className="text-sm text-white/55 line-clamp-2 mt-1.5 leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-white/45">
                          <span>{bnDate(post.created_at)}</span>
                          <span>{toBn(readMin)} মিনিট</span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
