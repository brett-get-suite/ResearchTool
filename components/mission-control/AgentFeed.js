'use client';

const AGENT_CONFIG = {
  audit:       { icon: 'fact_check',  color: 'text-primary',    label: 'Audit Agent' },
  bid:         { icon: 'trending_up', color: 'text-secondary',  label: 'Bid Agent' },
  ad_copy:     { icon: 'edit_note',   color: 'text-tertiary',   label: 'Ad Copy Agent' },
  budget:      { icon: 'account_balance', color: 'text-amber-400', label: 'Budget Agent' },
  keyword:     { icon: 'key',         color: 'text-primary',    label: 'Keyword Agent' },
  negative_kw: { icon: 'block',       color: 'text-error',      label: 'Negative KW Agent' },
  brand:       { icon: 'diamond',     color: 'text-tertiary',   label: 'Brand Agent' },
  website:     { icon: 'language',    color: 'text-primary',    label: 'Website Agent' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AgentFeed({ actions = [], accounts = [] }) {
  const accountMap = {};
  for (const a of accounts) accountMap[a.id] = a.name;

  return (
    <div className="bg-surface-container rounded-xl p-5 flex flex-col" style={{ minHeight: 400 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary text-lg">smart_toy</span>
          AI Agent Activity
        </h3>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary">
          {actions.length} actions
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 -mx-2 px-2" style={{ maxHeight: 480 }}>
        {actions.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/20 block mb-2">smart_toy</span>
            <p className="text-sm text-on-surface-variant mb-1">No agent activity yet</p>
            <p className="text-xs text-on-surface-variant/60">Enable agents in Agent Controls to automate bid and keyword management</p>
          </div>
        ) : (
          actions.slice(0, 50).map((action, i) => {
            const config = AGENT_CONFIG[action.agent_type] || AGENT_CONFIG.audit;
            const clientName = accountMap[action.account_id] || 'Unknown';

            return (
              <div
                key={action.id || i}
                className="flex gap-3 py-3 px-2 rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <span className={`material-symbols-outlined text-lg mt-0.5 flex-shrink-0 ${config.color}`}>
                  {config.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-on-surface leading-snug">
                    <span className="font-medium">{config.label}</span>
                    {' \u2014 '}
                    <span className="text-on-surface-variant">{action.description || 'Performed action'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-on-surface-variant">{clientName}</span>
                    <span className="text-[10px] text-on-surface-variant/40">&middot;</span>
                    <span className="text-xs text-on-surface-variant">{timeAgo(action.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
