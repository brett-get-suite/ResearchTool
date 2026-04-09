'use client';

import { AGENT_TYPES } from '@/lib/agent-config';

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ActionTimeline({ actions, onUndo }) {
  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">history</span>
          Recent Agent Actions
        </h3>
      </div>

      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-3 top-2 bottom-2 w-[2px] bg-outline-variant/15" />

        <div className="space-y-5">
          {(actions || []).slice(0, 8).map((action, i) => {
            const agentConfig = AGENT_TYPES[action.agent_type];
            const dotColor = agentConfig?.color || 'bg-on-surface-variant';

            return (
              <div key={action.id || i} className="relative pl-9">
                {/* Timeline dot */}
                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container ${dotColor}`} />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-on-surface">{action.description}</span>
                    {action.agent_type && (
                      <span className="text-label-sm text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
                        {agentConfig?.label || action.agent_type}
                      </span>
                    )}
                  </div>
                  {action.reasoning && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{action.reasoning}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-label-sm text-on-surface-variant">
                      {relativeTime(action.created_at)}
                    </span>
                    {action.before_state && !action.undone_at && onUndo && (
                      <button
                        onClick={() => onUndo(action.id)}
                        className="text-label-sm text-primary hover:text-primary-container transition-colors"
                      >
                        Undo
                      </button>
                    )}
                    {action.undone_at && (
                      <span className="text-label-sm text-on-surface-variant italic">Undone</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
