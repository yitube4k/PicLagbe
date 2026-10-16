import { AdminReviews } from '../components/admin/AdminContent';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/review ═══ */

export default function AdminPage_review() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="review" />
      <AdminReviews />
    </>
  );
}
