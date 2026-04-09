'use client';

import { useState } from 'react';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';

export default function ScalingOpportunity({ opportunity }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !opportunity) return null;

  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-secondary text-2xl">rocket_launch</span>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-on-surface mb-0.5">Autonomous Scaling Opportunity</h3>
          <p className="text-xs text-on-surface-variant truncate">{opportunity.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <GhostButton onClick={() => setDismissed(true)}>Dismiss</GhostButton>
        <GradientButton>Auto-Scale Campaign</GradientButton>
      </div>
    </div>
  );
}
