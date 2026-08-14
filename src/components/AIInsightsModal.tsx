import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Send,
  Compass,
  Lightbulb,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { VaultAuditSummary, VaultFile } from '../types';

interface AIInsightsModalProps {
  summary: VaultAuditSummary;
  files: VaultFile[];
  onClose: () => void;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  summary,
  files,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presetQueries = [
    {
      title: 'Suggest Maps of Content (MOCs)',
      icon: Compass,
      query:
        'Analyze my notes and suggest 3 high-leverage Maps of Content (MOCs) to connect isolated concepts and orphan notes.',
    },
    {
      title: 'Find Hidden Knowledge Bridges',
      icon: Lightbulb,
      query:
        'Identify 4 unexpected thematic bridges between my project notes and learning concepts that deserve bi-directional wikilinks.',
    },
    {
      title: 'PKM Taxonomy Critique',
      icon: Layers,
      query:
        'Evaluate my vault structure against Zettelkasten & PARA best practices. Provide 3 concrete organizational improvements.',
    },
  ];

  const handleRunAiAnalysis = async (customPrompt?: string) => {
    const textPrompt = customPrompt || prompt;
    if (!textPrompt.trim()) return;

    setLoading(true);
    setError(null);

    // Prepare compact context to avoid token bloat
    const notesSummary = files
      .filter((f) => !f.isAttachment)
      .slice(0, 35)
      .map((f) => ({
        name: f.baseName,
        folder: f.folder,
        tags: f.tags,
        linksCount: f.outgoingLinks.length,
        backlinksCount: f.backlinks.length,
        isOrphan: f.isOrphan,
      }));

    try {
      const res = await fetch('/api/vault/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt,
          vaultSummary: {
            name: summary.vaultName,
            totalNotes: summary.totalNotes,
            brokenLinksCount: summary.brokenLinksCount,
            orphanedNotesCount: summary.orphanedNotesCount,
            tags: Object.keys(summary.tagFrequency),
            sampleNotes: notesSummary,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI analysis');
      }

      setResult(data.analysis);
    } catch (err: any) {
      setError(err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#FCFCF9] border border-[#E5E5E1] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E5E5E1] bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1A1A1A] text-[#FCFCF9]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">AI Knowledge Advisor</h3>
              <p className="text-xs text-[#5A5A57]">
                Context-aware Second Brain optimization & MOC synthesis powered by Gemini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#8C8C88] hover:text-[#1A1A1A] hover:bg-[#F7F7F4] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Preset Prompts Grid */}
          <div>
            <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-2.5">
              Recommended Inquiries
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {presetQueries.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(item.query);
                      handleRunAiAnalysis(item.query);
                    }}
                    className="p-4 rounded-xl bg-[#FFFFFF] hover:bg-[#F7F7F4] border border-[#E5E5E1] hover:border-[#1A1A1A] text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#1A1A1A]">
                      <Icon className="w-4 h-4 text-[#1A1A1A]" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-[#5A5A57] line-clamp-2 leading-relaxed">{item.query}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Input */}
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunAiAnalysis()}
              placeholder="Ask anything about organizing your vault notes or generating synthesis..."
              className="flex-1 bg-[#FFFFFF] border border-[#E5E5E1] rounded-xl px-4 py-2.5 text-xs text-[#1A1A1A] placeholder:text-[#8C8C88] focus:outline-none focus:border-[#1A1A1A] shadow-xs"
            />
            <button
              type="button"
              disabled={loading || !prompt.trim()}
              onClick={() => handleRunAiAnalysis()}
              className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#333330] disabled:opacity-40 text-[#FCFCF9] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Inquire</span>
            </button>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#E5E5E1] border-t-[#1A1A1A] rounded-full animate-spin" />
              <p className="text-xs text-[#5A5A57]">Synthesizing vault architecture & generating recommendations...</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">AI Advisor Notice:</span> {error}
              </div>
            </div>
          )}

          {/* Result view */}
          {result && (
            <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold font-serif text-[#1A1A1A] uppercase tracking-wider border-b border-[#E5E5E1] pb-3">
                <Bot className="w-4 h-4 text-[#1A1A1A]" />
                <span>Advisor Synthesis</span>
              </div>
              <div className="text-sm font-serif text-[#1A1A1A] leading-relaxed whitespace-pre-wrap space-y-2">
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
