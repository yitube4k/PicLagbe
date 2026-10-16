import RoleRequestsPanel from '../components/RoleRequestsPanel';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/requests ═══ */

export default function AdminPage_requests() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="requests" />
      <RoleRequestsPanel />
    </>
  );
}
