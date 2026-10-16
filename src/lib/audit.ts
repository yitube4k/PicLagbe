import { supabase } from './supabase';

/**
 * ═══ অডিট লগ (Audit Log) ═══
 * অ্যাডমিন প্যানেলের প্রতিটি গুরুত্বপূর্ণ কাজ একটি টেবিলে সেভ থাকে —
 * পরে "অডিট রিপোর্ট" সেকশন থেকে দেখা, ফিল্টার ও রিপোর্ট সেভ করা যায়।
 *
 * ফায়ার-অ্যান্ড-ফরগেট: লগ ব্যর্থ হলেও মূল কাজ আটকাবে না (console.warn শুধু)।
 *
 * প্রত্যাশিত টেবিল (supabase_schema_v16_audit.sql):
 *   audit_logs(id, actor_id, actor_email, action, entity, entity_id, title, details, created_at)
 *   audit_reports(id, actor_id, actor_email, title, period_from, period_to, filters, entries, entry_count, created_at)
 */

export type AuditEntity =
  | 'user'
  | 'photographer'
  | 'post'
  | 'booking'
  | 'review'
  | 'blog'
  | 'category'
  | 'kyc'
  | 'role_request'
  | 'chat'
  | 'package'
  | 'gallery'
  | 'system';

export interface AuditDetails {
  /** ছোট মানুষের-পড়া বর্ণনা */
  note?: string;
  /** পরিবর্তনের আগে/পরে — শুধু দরকারি ফিল্ড */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** অন্য কোনো তথ্য (jsonb-এ যাবে) */
  meta?: Record<string, unknown>;
}

/** অ্যাডমিন অ্যাকশন লগ করুন — কখনো await করতে হবে না */
export function logAction(
  action: string,
  entity: AuditEntity,
  entityId?: string | null,
  title?: string | null,
  details?: AuditDetails
): void {
  (async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      const email =
        user?.email ||
        // auth.users-এ না থাকলে profiles থেকে টানার দরকার নেই — client email-ই যথেষ্ট
        null;

      const { error } = await supabase.from('audit_logs').insert({
        actor_id: user?.id || null,
        actor_email: email,
        action,
        entity,
        entity_id: entityId || null,
        title: title || null,
        details: details || null,
      });
      if (error) console.warn('[audit] log insert failed:', error.message);

      // V20: অ্যাডমিন অ্যাকশন রিসিপ্ট → নোটিফিকেশন ফিডেও (প্রি-রিড — ব্যাজে চাপ দেবে না)
      const { error: nErr } = await supabase.from('admin_notifications').insert({
        type: 'admin_action',
        title: `${title || ACTION_BN[action] || action} — ${ENTITY_BN[entity] || entity}`,
        body: details?.note || (title ? `${ACTION_BN[action] || action} সম্পন্ন হয়েছে।` : 'অ্যাকশন সম্পন্ন হয়েছে।'),
        target_section: NOTIF_SECTION[entity] || '/admin/dashboard',
        entity_id: entityId || null,
        actor_id: user?.id || null,
        is_read: true,
        metadata: { action, entity },
      });
      if (nErr) console.warn('[audit] notification receipt failed:', nErr.message);
    } catch (e) {
      console.warn('[audit] logAction failed:', e);
    }
  })();
}

/** অ্যাকশনের বাংলা নাম — রিপোর্ট UI-তে দেখানোর জন্য */
export const ACTION_BN: Record<string, string> = {
  create: 'তৈরি',
  update: 'আপডেট',
  delete: 'ডিলিট',
  approve: 'অনুমোদন',
  reject: 'বাতিল',
  verify: 'ভেরিফাই',
  unverify: 'ভেরিফাই বাতিল',
  publish: 'প্রকাশ',
  unpublish: 'অপ্রকাশ',
  role_change: 'রোল পরিবর্তন',
  status_change: 'স্ট্যাটাস পরিবর্তন',
  report_saved: 'রিপোর্ট সেভ',
};

/** এন্টিটির বাংলা নাম */
export const ENTITY_BN: Record<string, string> = {
  user: 'ইউজার',
  photographer: 'ফটোগ্রাফার',
  post: 'পোস্ট',
  booking: 'বুকিং',
  review: 'রিভিউ',
  blog: 'ব্লগ',
  category: 'ক্যাটাগরি',
  kyc: 'KYC',
  role_request: 'রোল রিকোয়েস্ট',
  chat: 'চ্যাট',
  package: 'প্যাকেজ',
  gallery: 'ফটো গ্যালারি',
  system: 'সিস্টেম',
};

/** V20 — এন্টিটি → নোটিফিকেশন রিসিপ্টের টার্গেট সেকশন (আমাদের রাউট) */
const NOTIF_SECTION: Record<string, string> = {
  user: '/admin/user',
  photographer: '/admin/photographer',
  post: '/admin/post',
  booking: '/admin/booking',
  review: '/admin/review',
  blog: '/admin/blog',
  category: '/admin/category',
  kyc: '/admin/kyc',
  role_request: '/admin/requests',
  chat: '/admin/chat',
  system: '/admin/settings',
};
