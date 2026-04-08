import StatCard from '@/components/ui/StatCard';

export default function HeroMetrics({ accounts, metrics }) {
  const totalSpend = Object.values(metrics).reduce((sum, m) => {
    const cost = m?.account?.cost_micros ? m.account.cost_micros / 1_000_000 : 0;
    return sum + cost;
  }, 0);

  const totalConversions = Object.values(metrics).reduce((sum, m) => {
    return sum + (m?.account?.conversions || 0);
  }, 0);

  const totalConvValue = Object.values(metrics).reduce((sum, m) => {
    return sum + (m?.account?.conversions_value || 0);
  }, 0);

  const avgRoas = totalSpend > 0 ? totalConvValue / totalSpend : 0;

  const activeAgents = accounts.filter(a => a.settings?.agents_enabled !== false).length;
  const totalAgentSlots = accounts.length;

  function fmtMoney(n) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <StatCard
        label="Total Ad Spend"
        value={fmtMoney(totalSpend)}
        deltaLabel="All accounts"
        icon="payments"
      />
      <StatCard
        label="Avg. ROAS"
        value={avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '\u2014'}
        deltaLabel="Portfolio-wide"
        icon="trending_up"
      />
      <StatCard
        label="Total Leads"
        value={totalConversions >= 1000 ? `${(totalConversions / 1000).toFixed(1)}k` : String(totalConversions)}
        deltaLabel="All channels"
        icon="group"
      />
      <StatCard
        label="AI Agents Active"
        value={`${activeAgents}/${totalAgentSlots}`}
        deltaLabel="Processing"
        icon="smart_toy"
      />
    </div>
  );
}
