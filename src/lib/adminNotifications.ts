import { supabase } from './supabase';

/**
 * ═══ অ্যাডমিন নোটিফিকেশন (V20 — dedicated section) ═══
 * DB: admin_notifications (supabase_schema_v20_notifications.sql)
 * ইভেন্টগুলো Postgres ট্রিগার থেকে স্বয়ংক্রিয়ভাবে আসে — নতুন বুকিং, পোস্ট, KYC,
 * ফটোগ্রাফার, রোল রিকোয়েস্ট, ইউজার, রিভিউ, চ্যাট + অ্যাডমিন অ্যাকশন রিসিপ্ট (logAction)।
 * রিয়েলটাইম: supabase_realtime publication-এ টেবিল যুক্ত — লাইভ আপডেট।
 */

export type AdminNotificationType =
  | 'new_booking'
  | 'post_pending'
  | 'kyc_submitted'
  | 'photographer_signup'
  | 'role_request'
  | 'user_signup'
  | 'new_review'
  | 'new_chat'
  | 'admin_action';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  target_section: string;
  entity_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type NotifFilter = 'all' | 'unread' | AdminNotificationType;

/** নোটিফিকেশন ফিড আনুন (RLS: শুধু অ্যাডমিন) */
export async function fetchAdminNotifications(
  filter: NotifFilter = 'all',
  limit = 150,
): Promise<AdminNotification[]> {
  let query = supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filter === 'unread') query = query.eq('is_read', false);
  else if (filter !== 'all') query = query.eq('type', filter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as AdminNotification[]) || [];
}

/** অপঠিত সংখ্যা (head count — হালকা) */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

/** একটি পঠিত করুন (ইতিমধ্যে পঠিত হলে নীরব) */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}

/** সব পঠিত করুন */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}

/**
 * রিয়েলটাইম সাবস্ক্রিপশন — INSERT/UPDATE ইভেন্টে কলব্যাক।
 * রিটার্ন করা cleanup ফাংশন useEffect-এ অবশ্যই কল করতে হবে।
 */
export function subscribeAdminNotifications(handlers: {
  onInsert?: (n: AdminNotification) => void;
  onUpdate?: (n: AdminNotification) => void;
}): () => void {
  // V20 fix: প্রতিটি সাবস্ক্রাইবারের নিজস্ব চ্যানেল — supabase.channel() একই নামের
  // চ্যানেল রিইউজ করে, আর সাবস্ক্রাইব-করা চ্যানেলে .on() কল করলে ক্র্যাশ হয়
  // ("cannot add postgres_changes callbacks after subscribe")।
  const channelName = `admin-notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
      (payload) => handlers.onInsert?.(payload.new as AdminNotification),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'admin_notifications' },
      (payload) => handlers.onUpdate?.(payload.new as AdminNotification),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
