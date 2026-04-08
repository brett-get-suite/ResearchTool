// components/analysis/AuditChat.js
'use client';

import { useState, useRef, useEffect } from 'react';

export default function AuditChat({ accountId, analysisId, focusContext, onClearFocus }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/reports/${accountId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          messages: [...messages, userMsg],
          focusContext: focusContext || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-2.5 rounded-xl font-semibold text-sm text-on-primary bg-gradient-to-br from-primary to-primary-container shadow-lg z-40 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">chat</span>
        Ask about this data
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-surface-container-low border-l border-outline-variant/10 flex flex-col z-40 shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
        <div>
          <p className="font-label font-bold text-on-surface text-sm">Audit Assistant</p>
          <p className="text-[10px] text-on-surface-variant font-label">AI on computed data — not real-time</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Focus context banner */}
      {focusContext && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
          <p className="text-[11px] font-label text-primary">
            Focused: {focusContext.phrase || focusContext.campaign || focusContext.searchTerm || JSON.stringify(focusContext).slice(0, 40)}
          </p>
          <button onClick={onClearFocus} className="text-on-surface-variant hover:text-primary text-[11px] font-label">clear</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-xs text-on-surface-variant font-label">Ask anything about this account.</p>
            <div className="space-y-1.5">
              {["What's the biggest waste in this account?", 'Which campaign should I scale first?', 'What negatives am I missing?'].map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="block w-full text-left text-xs font-label px-3 py-2 rounded-xl bg-surface-container hover:bg-primary/5 text-on-surface-variant hover:text-primary transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs font-label leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container rounded-xl px-3 py-2">
              <span className="text-xs text-on-surface-variant font-label animate-pulse">Analyzing…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-outline-variant/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about this account…"
            className="flex-1 text-xs font-label px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/10 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-on-primary bg-gradient-to-br from-primary to-primary-container disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
