/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GridSquare } from '../types';
import { GRID_COLS, FINANCE_COLS } from '../constants';

interface StatsGridProps {
  squares: GridSquare[];
  stats: Record<string, string[]>;
  onStatChange: (squareId: string, colIdx: number, value: string) => void;
  financeStats: Record<string, string[]>;
  onFinanceStatChange: (squareId: string, colIdx: number, value: string) => void;
  computedMonetary: Record<string, (number | null)[]>;
  priceThresholds: Record<string, ([number, number, number, number] | null)[]>;
  onLoadStats: (newStats: Record<string, string[]>) => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  squares,
  stats,
  onStatChange,
  financeStats,
  onFinanceStatChange,
  computedMonetary,
  priceThresholds,
  onLoadStats,
}) => {
  const [activeTab, setActiveTab] = React.useState<'points' | 'finance'>('points');
  const [statsInput, setStatsInput] = React.useState('');
  const [copyFeedback, setCopyFeedback] = React.useState(false);

  const serializeStats = (): string => {
    const parts: string[] = [];
    for (const sq of squares) {
      const values = stats[sq.id];
      if (!values) continue;
      let lastIdx = -1;
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] !== undefined && values[i] !== '') { lastIdx = i; break; }
      }
      if (lastIdx < 0) continue;
      const valStr = Array.from({ length: lastIdx + 1 }, (_, i) =>
        (values[i] !== undefined && values[i] !== '') ? values[i] : '_'
      ).join(',');
      parts.push(`${sq.code}[${valStr}]`);
    }
    return parts.join('-');
  };

  const deserializeStats = (str: string): Record<string, string[]> | null => {
    try {
      const result: Record<string, string[]> = {};
      const pattern = /([A-Z]{2,4})\[([^\]]*)\]/g;
      let match;
      while ((match = pattern.exec(str.toUpperCase())) !== null) {
        const code = match[1];
        const valStr = match[2];
        const sq = squares.find((s) => s.code.toUpperCase() === code);
        if (!sq) continue;
        const vals = valStr.split(',').map((v) => v.trim() === '_' ? '' : v.trim());
        const padded = Array(GRID_COLS).fill('');
        vals.forEach((v, i) => { if (i < GRID_COLS) padded[i] = v; });
        result[sq.id] = padded;
      }
      if (Object.keys(result).length === 0) return null;
      return result;
    } catch {
      return null;
    }
  };

  const handleCopy = async () => {
    const str = serializeStats();
    if (!str) return;
    await navigator.clipboard.writeText(str);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleLoad = () => {
    if (statsInput.trim() === '') {
      onLoadStats({});
      return;
    }
    const newStats = deserializeStats(statsInput);
    if (newStats) {
      onLoadStats(newStats);
      setStatsInput('');
    }
  };
  const isFinance = activeTab === 'finance';
  const columnsCount = isFinance ? FINANCE_COLS : GRID_COLS;

  const getColHeaderLabel = (colIdx: number) => {
    if (isFinance) {
      return colIdx.toString().padStart(2, '0');
    }
    return (colIdx + 1).toString().padStart(2, '0');
  };

  return (
    <div className="w-full bg-[#18191c] rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-white/[0.02] relative overflow-hidden">
      {/* Background radial soft light gradient */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10 select-none">
        <h3 className="font-sans text-xl sm:text-2xl font-medium tracking-tight text-white">
          Stats
        </h3>

        {/* Toggle */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('points')}
            className={`transition-colors ${activeTab === 'points' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Points
          </button>
          <span className="text-gray-700">|</span>
          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`transition-colors ${activeTab === 'finance' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Monetary
          </button>
        </div>
      </div>

      {/* Grid Scroll Wrapper with No-Scrollbar */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="min-w-max p-2 relative">

          {/* Copy / load — above column 24, right-aligned, points tab only */}
          {!isFinance && (
            <div className="flex w-full justify-end items-center gap-2 mb-1">
              <button
                onClick={handleCopy}
                title={copyFeedback ? 'Copied!' : 'Copy points to clipboard'}
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              >
                {copyFeedback ? (
                  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
              <input
                type="text"
                value={statsInput}
                onChange={(e) => setStatsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLoad(); }}
                placeholder="code"
                style={{ width: '4rem' }}
                className="flex-shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1 text-[11px] font-mono text-gray-300 placeholder-gray-600 outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={handleLoad}
                className="text-[11px] font-mono text-white/50 hover:text-white transition-colors px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex-shrink-0"
              >
                Load
              </button>
            </div>
          )}

          {/* Columns Header */}
          <div className="flex items-center mb-2">
            {/* Left spacer matching row label offset */}
            <div className="w-6 mr-2 shrink-0" />
            
            <div className="flex gap-2">
              {/* Empty spacer matching the Column containing the Square Box */}
              <div className="w-9 sm:w-11 md:w-12 shrink-0" />
              
              {Array.from({ length: columnsCount }).map((_, colIdx) => (
                <div
                  key={colIdx}
                  className="w-9 sm:w-11 md:w-12 text-center font-mono text-[10px] font-semibold text-gray-500 shrink-0"
                >
                  {getColHeaderLabel(colIdx)}
                </div>
              ))}
            </div>
          </div>

          {/* 33 Rows for teams & drivers */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto no-scrollbar pr-1 hover:scrollbar-thin scrollbar-thumb-white/[0.05]">
            {squares.map((sq) => {
              const values = isFinance
                ? (financeStats[sq.id] || Array(FINANCE_COLS).fill(''))
                : (stats[sq.id] || Array(GRID_COLS).fill(''));
              
              return (
                <div key={sq.id} className="flex items-center group">
                  
                  {/* Left spacer matching A-G row label offset */}
                  <div className="w-6 mr-2 shrink-0" />

                  {/* Unified row contents spaced exactly with gap-2 */}
                  <div className="flex gap-2">
                    {/* Left Label: Styled square box */}
                    <div
                      className={`
                        w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12
                        rounded-xl
                        flex
                        items-center
                        justify-center
                        font-mono
                        font-bold
                        text-[11px]
                        sm:text-xs
                        tracking-wider
                        shadow-md
                        select-none
                        relative
                        shrink-0
                        ${sq.textColor || 'text-white'}
                      `}
                      style={{
                        backgroundColor: sq.color,
                      }}
                    >
                      <span className="relative z-10">{sq.code}</span>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-black/20 via-transparent to-white/10 opacity-100 z-0 pointer-events-none" />
                    </div>

                    {/* Numeric Input / Computed Cells */}
                    {Array.from({ length: columnsCount }).map((_, colIdx) => {
                      // Finance columns 1–24: auto-computed, read-only
                      if (isFinance && colIdx > 0) {
                        const price = computedMonetary[sq.id]?.[colIdx - 1];
                        return (
                          <div
                            key={colIdx}
                            className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-[#1e1f24] flex items-center justify-center font-mono text-[12px] rounded-xl border border-white/[0.02] select-none"
                          >
                            {price !== null && price !== undefined
                              ? <span className="text-gray-300">{price.toFixed(1)}</span>
                              : <span className="text-gray-700">—</span>
                            }
                          </div>
                        );
                      }

                      // Finance col 0 or Points: editable input
                      const hasValue = values[colIdx] !== undefined && values[colIdx] !== '';
                      const hints = !isFinance && !hasValue ? priceThresholds[sq.id]?.[colIdx] : null;

                      return (
                        <div key={colIdx} className="relative w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 flex-shrink-0">
                          <input
                            type="text"
                            value={values[colIdx] || ''}
                            onChange={(e) => {
                              if (isFinance) {
                                onFinanceStatChange(sq.id, colIdx, e.target.value);
                              } else {
                                onStatChange(sq.id, colIdx, e.target.value);
                              }
                            }}
                            placeholder={isFinance ? '-' : ''}
                            className="w-full h-full bg-[#24252a] text-white text-center font-mono text-[13px] rounded-xl border border-white/[0.03] focus:border-white/20 focus:ring-1 focus:ring-white/10 focus:outline-none transition-all placeholder-gray-700"
                            id={`${activeTab}-stat-${sq.id}-${colIdx}`}
                          />
                          {hints && (
                            <>
                              <span className="absolute top-[3px] left-[3px] text-[7px] sm:text-[8px] font-mono font-semibold text-purple-400/50 pointer-events-none select-none leading-none">{hints[0]}</span>
                              <span className="absolute top-[3px] right-[3px] text-[7px] sm:text-[8px] font-mono font-semibold text-green-400/50 pointer-events-none select-none leading-none">{hints[1]}</span>
                              <span className="absolute bottom-[3px] left-[3px] text-[7px] sm:text-[8px] font-mono font-semibold text-yellow-400/50 pointer-events-none select-none leading-none">{hints[2]}</span>
                              <span className="absolute bottom-[3px] right-[3px] text-[7px] sm:text-[8px] font-mono font-semibold text-red-400/50 pointer-events-none select-none leading-none">{hints[3]}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-end text-[11px] font-mono text-gray-500 border-t border-white/5 pt-4">
        <span className="text-gray-400">
          Grid: {squares.length} Assets x {columnsCount} Columns
        </span>
      </div>
    </div>
  );
};
