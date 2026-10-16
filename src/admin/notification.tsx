import AdminNotifications from '../components/admin/AdminNotifications';
import { PageHeader } from './PageHeader';

/* ═══ V20 modular admin page — /admin/notification (dedicated feed) ═══ */

export default function AdminPage_notification() {
  return (
    <>
      <PageHeader slug="notification" />
      <AdminNotifications />
    </>
  );
}
