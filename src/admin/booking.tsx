import { AdminBookings } from '../components/admin/AdminOps';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/booking ═══ */

export default function AdminPage_booking() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="booking" />
      <AdminBookings />
    </>
  );
}
