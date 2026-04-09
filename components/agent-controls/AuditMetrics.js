import StatCard from '@/components/ui/StatCard';

export default function AuditMetrics({ auditScore, prevAuditScore, wastedSpend, optimizationUplift }) {
  const scoreDelta = prevAuditScore != null && prevAuditScore > 0
    ? ((auditScore - prevAuditScore) / prevAuditScore * 100).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Overall Audit Score"
        value={`${auditScore || 0}/100`}
        delta={scoreDelta ? `${scoreDelta > 0 ? '+' : ''}${scoreDelta}%` : null}
        deltaLabel="vs last week"
        icon="speed"
      />
      <StatCard
        label="Wasted Spend Detected"
        value={`$${(wastedSpend || 0).toLocaleString()}`}
        deltaLabel={wastedSpend > 0 ? 'Zero-conversion keywords flagged' : 'No waste detected'}
        icon="money_off"
        variant={wastedSpend > 100 ? 'warning' : 'default'}
      />
      <StatCard
        label="AI Optimization Uplift"
        value={`${(optimizationUplift || 0).toFixed(1)}%`}
        deltaLabel="Autonomous improvements"
        icon="auto_awesome"
      />
    </div>
  );
}
