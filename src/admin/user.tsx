import AdminUsers from '../components/admin/AdminUsers';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/user ═══ */

export default function AdminPage_user() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="user" />
      <AdminUsers onChanged={refresh} />
    </>
  );
}
