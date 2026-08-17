/**
 * Shared currency formatter (mobile).
 *
 * All customer/salesman-facing prices are displayed in Australian Dollars.
 * Use this instead of ad-hoc `Rs. ${amount.toLocaleString()}` strings so
 * formatting stays consistent across the app.
 */

const formatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

export function formatCurrency(amount: number | null | undefined): string {
  return formatter.format(amount || 0);
}
