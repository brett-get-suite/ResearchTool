import StatusBadge from '@/components/ui/StatusBadge';
import { AGENT_TYPES, AGENT_TYPE_KEYS } from '@/lib/agent-config';

export default function AgentCards({ latestRuns }) {
  function getAgentStatus(type) {
    const run = (latestRuns || []).find((r) => r.agent_type === type);
    if (!run) return { status: 'idle', description: 'Not yet configured', lastRun: null };
    if (run.status === 'running') return { status: 'running', description: run.summary || 'Processing...', lastRun: run.updated_at };
    if (run.status === 'error') return { status: 'alert', description: run.error || 'Error occurred', lastRun: run.updated_at };
    return { status: 'active', description: run.summary || 'Last run completed', lastRun: run.updated_at || run.completed_at };
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {AGENT_TYPE_KEYS.map((type) => {
        const config = AGENT_TYPES[type];
        const { status, description, lastRun } = getAgentStatus(type);

        return (
          <div
            key={type}
            className={`bg-surface-container rounded-xl p-5 transition-opacity ${
              status === 'idle' ? 'opacity-75' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">
                  {config.icon}
                </span>
              </div>
              <StatusBadge
                status={status}
                pulse={status === 'running'}
              />
            </div>
            <h3 className="text-sm font-semibold text-on-surface mb-1">{config.label}</h3>
            <p className="text-xs text-on-surface-variant mb-3 line-clamp-2">{description}</p>
            {lastRun && (
              <div className="text-label-sm text-on-surface-variant">
                Last run: {relativeTime(lastRun)}
              </div>
            )}
            {status === 'alert' && (
              <button className="mt-3 px-3 py-1.5 rounded-lg bg-error/15 text-error text-xs font-medium hover:bg-error/25 transition-colors">
                Review Conflict
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
