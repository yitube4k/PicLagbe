import { AdminCategories } from '../components/admin/AdminContent';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/category ═══ */

export default function AdminPage_category() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="category" />
      <AdminCategories />
    </>
  );
}
