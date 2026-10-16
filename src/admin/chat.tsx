import { AdminChats } from '../components/admin/AdminOps';
import { PageHeader } from './PageHeader';
import { useAdminCounts } from './counts';

/* ═══ V18 modular admin page — /admin/chat ═══ */

export default function AdminPage_chat() {
  const { refresh } = useAdminCounts();
  return (
    <>
      <PageHeader slug="chat" />
      <AdminChats />
    </>
  );
}
