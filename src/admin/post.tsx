import AdminPosts from '../components/admin/AdminPosts';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/post ═══ */

export default function AdminPage_post() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="post" />
      <AdminPosts onChanged={refresh} />
    </>
  );
}
