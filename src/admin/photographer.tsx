import AdminPhotographers from '../components/admin/AdminPhotographers';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/photographer ═══ */

export default function AdminPage_photographer() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="photographer" />
      <AdminPhotographers onChanged={refresh} />
    </>
  );
}
