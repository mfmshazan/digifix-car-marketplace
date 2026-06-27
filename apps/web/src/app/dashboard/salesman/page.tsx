// Salesman dashboard route. Renders the shared seller dashboard locked to the
// SALESMAN role — products and car parts are view-only (no add/edit, no wallet).
import SellerDashboard from '@/components/seller-dashboard';

export default function SalesmanDashboardPage() {
  return <SellerDashboard expectedRole="SALESMAN" />;
}
