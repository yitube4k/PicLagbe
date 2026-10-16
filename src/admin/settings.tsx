import AdminSettings from '../components/admin/AdminSettings';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/settings ═══ */

export default function AdminPage_settings() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="settings" />
      <AdminSettings />
    </>
  );
}
