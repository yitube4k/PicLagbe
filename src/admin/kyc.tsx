import { AdminKyc } from '../components/admin/AdminOps';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/kyc ═══ */

export default function AdminPage_kyc() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="kyc" />
      <AdminKyc onChanged={refresh} />
    </>
  );
}
