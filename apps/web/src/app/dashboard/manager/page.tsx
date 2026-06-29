// Shop Manager dashboard route. Renders the shared seller dashboard for the
// SHOP_MANAGER role — the catalog owner who can add/edit products & car parts
// and owns the store wallet.
import SellerDashboard from '@/components/seller-dashboard';

export default function ManagerDashboardPage() {
  return <SellerDashboard expectedRole="SHOP_MANAGER" />;
}
