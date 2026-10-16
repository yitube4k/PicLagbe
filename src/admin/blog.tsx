import { AdminBlog } from '../components/admin/AdminContent';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/blog ═══ */

export default function AdminPage_blog() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="blog" />
      <AdminBlog />
    </>
  );
}
