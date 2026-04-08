import GradientButton from '@/components/ui/GradientButton';

export default function AdPreview({ adCopy, brandProfile }) {
  const headline = adCopy?.headlines?.[0] || 'Your Ad Headline Here';
  const description = adCopy?.descriptions?.[0] || 'Your ad description will appear here with compelling copy.';
  const displayUrl = adCopy?.display_url || 'www.example.com';

  const suggestions = adCopy?.suggestions || {};

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">AI Ad Preview</h3>
        <GradientButton className="text-xs px-3 py-1.5">
          <span className="material-symbols-outlined text-sm">bolt</span>
          Create Campaign
        </GradientButton>
      </div>

      {/* Google Search Preview */}
      <div className="bg-surface-container-low rounded-xl p-4 mb-4">
        <div className="flex items-center gap-1 mb-1">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="text-label-sm text-secondary">Google Search Preview</span>
        </div>
        <div className="text-xs text-on-surface-variant mb-1">Ad &middot; {displayUrl}</div>
        <div className="text-primary text-sm font-semibold mb-1 hover:underline cursor-pointer">
          {headline}
        </div>
        <div className="text-xs text-on-surface-variant leading-relaxed">{description}</div>
      </div>

      {/* Suggested Focus */}
      {Object.keys(suggestions).length > 0 && (
        <div className="mb-4">
          <div className="text-label-sm text-on-surface-variant mb-3">Suggested Focus</div>
          <div className="space-y-2">
            {Object.entries(suggestions).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">{key}</span>
                <span className="text-on-surface font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="w-full py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors">
        Generate More Variations
      </button>
    </div>
  );
}
