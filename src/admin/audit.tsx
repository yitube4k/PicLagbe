import AdminAudit from '../components/admin/AdminAudit';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/audit ═══ */

export default function AdminPage_audit() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="audit" />
      <AdminAudit />
    </>
  );
}
