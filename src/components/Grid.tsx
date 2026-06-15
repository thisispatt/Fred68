/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GridSquare } from '../types';
import { GridCell } from './GridCell';
import { SquareItem } from './SquareItem';
import { GRID_COLS, GRID_ROWS, F1_TEAMS } from '../constants';

interface GridProps {
  grid: (GridSquare | null)[][];
  onDropItem: (row: number, col: number, isCopy?: boolean) => void;
  onDragStartItem: (e: React.DragEvent, item: GridSquare, source: { row: number; col: number }) => void;
  onDragEndItem: () => void;
  onRemoveItem: (row: number, col: number) => void;
  onClickItem?: (row: number, col: number) => void;
  title: string;
  onTitleChange: (newTitle: string) => void;
  columnTotals: number[];
  columnCosts: number[];
  budget: number;
  reserves: number;
  selectedCell: { row: number; col: number } | null;
  onSelectCell: (row: number, col: number) => void;
  computedMonetary: Record<string, (number | null)[]>;
  allSquares: GridSquare[];
  placedIds: Set<string>;
  unaffordableIds: Set<string>;
  onDragStartFromPool: (e: React.DragEvent, sq: GridSquare) => void;
  onDragEndFromPool: () => void;
  draggedItemId: string | null;
  onLoadSetup: (newGrid: (GridSquare | null)[][]) => void;
}

export const Grid: React.FC<GridProps> = ({
  grid,
  onDropItem,
  onDragStartItem,
  onDragEndItem,
  onRemoveItem,
  onClickItem,
  title,
  onTitleChange,
  columnTotals,
  columnCosts,
  budget,
  reserves,
  selectedCell,
  onSelectCell,
  computedMonetary,
  allSquares,
  placedIds,
  unaffordableIds,
  onDragStartFromPool,
  onDragEndFromPool,
  draggedItemId,
  onLoadSetup,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [setupInput, setSetupInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const serializeGrid = (): string => {
    let lastCol = -1;
    for (let col = GRID_COLS - 1; col >= 0; col--) {
      for (let row = 0; row < GRID_ROWS; row++) {
        if (grid[row][col] !== null) { lastCol = col; break; }
      }
      if (lastCol >= 0) break;
    }
    if (lastCol < 0) return '';
    return Array.from({ length: lastCol + 1 }, (_, col) =>
      Array.from({ length: GRID_ROWS }, (_, row) => {
        const cell = grid[row][col];
        if (!cell) return '_';
        return cell.isDouble ? `${cell.code}*` : cell.code;
      }).join('-')
    ).join('/');
  };

  const deserializeGrid = (str: string): (GridSquare | null)[][] | null => {
    try {
      const colStrings = str.trim().split('/');
      const newGrid: (GridSquare | null)[][] = Array.from(
        { length: GRID_ROWS }, () => Array(GRID_COLS).fill(null)
      );
      for (let col = 0; col < Math.min(colStrings.length, GRID_COLS); col++) {
        const rowStrings = colStrings[col].split('-');
        let driverCount = 0;
        let teamCount = 0;
        const seenCodes = new Set<string>();
        for (let row = 0; row < Math.min(rowStrings.length, GRID_ROWS); row++) {
          const slot = rowStrings[row].trim();
          if (!slot || slot === '_') continue;
          const isDouble = slot.endsWith('*');
          const code = (isDouble ? slot.slice(0, -1) : slot).toUpperCase();
          const sq = allSquares.find((s: GridSquare) => s.code.toUpperCase() === code);
          if (!sq) continue;
          if (seenCodes.has(code)) continue;
          if (sq.type === 'driver' && driverCount >= 5) continue;
          if (sq.type === 'team' && teamCount >= 2) continue;
          seenCodes.add(code);
          if (sq.type === 'driver') driverCount++;
          else teamCount++;
          newGrid[row][col] = { ...sq, id: `${sq.id}-col-${col}`, isDouble };
        }
      }
      return newGrid;
    } catch {
      return null;
    }
  };

  const handleCopy = async () => {
    const str = serializeGrid();
    if (!str) return;
    await navigator.clipboard.writeText(str);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleLoad = () => {
    const newGrid = deserializeGrid(setupInput);
    if (newGrid) {
      onLoadSetup(newGrid);
      setSetupInput('');
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSubmit();
    if (e.key === 'Escape') {
      setTempTitle(title);
      setIsEditingTitle(false);
    }
  };

  const getRowLabel = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="w-full bg-[#18191c] rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-white/[0.02] relative overflow-hidden">
      {/* Background radial soft light gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Grid Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10 select-none">
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleKeyDown}
              className="bg-[#24252a] text-white font-sans text-xl sm:text-2xl font-semibold px-3 py-1 rounded-xl outline-none border border-white/10 w-full max-w-sm"
              autoFocus
              maxLength={40}
            />
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className="text-white font-sans text-xl sm:text-2xl font-medium tracking-tight hover:text-white/80 cursor-pointer flex items-center gap-2 group transition-colors"
            >
              <span>{title}</span>
              <svg
                className="w-4 h-4 text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </h2>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
          <div className="flex items-center gap-1">
            <span>Cost Cap</span>
            <span className={`font-semibold tabular-nums inline-block w-[2.75rem] text-right ${budget < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {budget.toFixed(1)}
            </span>
          </div>
          <span className="text-gray-700">|</span>
          <div className="flex items-center gap-1">
            <span>Reserves</span>
            <span className={`font-semibold tabular-nums inline-block w-[2.75rem] text-right ${reserves < 0 ? 'text-red-400' : 'text-white'}`}>
              {reserves.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Paddock — teams in rows of 3, no labels */}
      <div className="flex flex-wrap gap-2 mb-6 relative z-10">
        {F1_TEAMS.map((team) => {
          const teamSquares = allSquares.filter((sq) => sq.teamId === team.id);
          return (
            <div
              key={team.id}
              className="flex gap-2 items-center border border-white/[0.04] rounded-2xl p-3"
            >
              {teamSquares.map((sq) => {
                const unaffordable = unaffordableIds.has(sq.id);
                return (
                  <div
                    key={sq.id}
                    className={`w-11 h-11 sm:w-12 sm:h-12 relative group flex-shrink-0 transition-opacity duration-200 ${unaffordable ? 'opacity-30' : 'opacity-100'}`}
                  >
                    <SquareItem
                      item={sq}
                      onDragStart={(e, item) => onDragStartFromPool(e, item)}
                      onDragEnd={onDragEndFromPool}
                      isDragging={draggedItemId === sq.id}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Grid Wrapper with Beautiful Horizon Scroller */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="min-w-max p-2 relative">
          {/* Copy / search / load — above column 24, right-aligned */}
          <div className="flex w-full justify-end items-center gap-2 mb-1">
            <button
              onClick={handleCopy}
              title={copyFeedback ? 'Copied!' : 'Copy setup to clipboard'}
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
              value={setupInput}
              onChange={(e) => setSetupInput(e.target.value)}
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

          {/* Columns Label Header */}
          <div className="flex pl-8 mb-2">
            {Array.from({ length: GRID_COLS }).map((_, colIdx) => (
              <div
                key={colIdx}
                className={`
                  w-9 sm:w-11 md:w-12
                  text-center
                  font-mono
                  text-[10px]
                  font-semibold
                  transition-colors
                  duration-150
                  ${colIdx === hoveredCol ? 'text-white' : 'text-gray-600'}
                `}
                style={{ marginLeft: colIdx > 0 ? '0.5rem' : '0px' }}
              >
                {(colIdx + 1).toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {Array.from({ length: GRID_ROWS }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex items-center">
                {/* Row Letter Header */}
                <span
                  className={`
                    w-6
                    mr-2
                    font-mono
                    text-xs
                    font-bold
                    text-left
                    transition-colors
                    duration-150
                    ${rowIdx === hoveredRow ? 'text-white' : 'text-gray-600'}
                  `}
                >
                  {getRowLabel(rowIdx)}
                </span>

                {/* Grid Cells */}
                <div className="flex gap-2">
                  {Array.from({ length: GRID_COLS }).map((_, colIdx) => (
                    <div
                      key={colIdx}
                      onMouseEnter={() => {
                        setHoveredRow(rowIdx);
                        setHoveredCol(colIdx);
                      }}
                      onMouseLeave={() => {
                        setHoveredRow(null);
                        setHoveredCol(null);
                      }}
                    >
                      <GridCell
                        row={rowIdx}
                        col={colIdx}
                        item={grid[rowIdx][colIdx]}
                        onDrop={onDropItem}
                        onDragStartItem={onDragStartItem}
                        onDragEndItem={onDragEndItem}
                        onRemoveItem={onRemoveItem}
                        onClickItem={onClickItem}
                        highlightedRow={hoveredRow}
                        highlightedCol={hoveredCol}
                        isSelected={selectedCell?.row === rowIdx && selectedCell?.col === colIdx}
                        onSelectCell={onSelectCell}
                        price={(() => {
                          const item = grid[rowIdx][colIdx];
                          if (!item) return null;
                          const baseId = item.id.split('-col-')[0];
                          for (let i = colIdx; i >= 0; i--) {
                            const p = computedMonetary[baseId]?.[i];
                            if (p !== null && p !== undefined) return p;
                          }
                          return null;
                        })()}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Under row G: The calculated total number row */}
          <div className="flex items-center mt-5 mb-2">
            <span className="w-6 mr-2 font-mono text-[10px] sm:text-xs font-black text-gray-600 text-left select-none uppercase tracking-tight">
              TOT
            </span>
            <div className="flex gap-2">
              {columnTotals.map((tot, colIdx) => (
                <div
                  key={colIdx}
                  className={`w-9 sm:w-11 md:w-12 text-center font-mono text-[11px] font-bold transition-colors duration-150 ${tot > 0 ? 'text-white' : 'text-gray-600'}`}
                >
                  {tot > 0 ? tot : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Cost row — total $ of placed assets per column */}
          <div className="flex items-center mb-2">
            <span className="w-6 mr-2 font-mono text-[10px] sm:text-xs font-black text-gray-600 text-left select-none uppercase tracking-tight">
              $
            </span>
            <div className="flex gap-2">
              {columnCosts.map((cost, colIdx) => (
                <div
                  key={colIdx}
                  className={`w-9 sm:w-11 md:w-12 text-center font-mono text-[11px] font-bold ${cost > 0 ? 'text-white' : 'text-gray-600'}`}
                >
                  {cost > 0 ? cost.toFixed(1) : ''}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Grid Footer Controls and Pro Tips */}
      <div className="mt-4 flex items-center justify-end text-[11px] font-mono text-gray-500 border-t border-white/5 pt-4">
        <span className="text-gray-400">
          Grid: {GRID_COLS} Races x {GRID_ROWS} Assets
        </span>
      </div>
    </div>
  );
};
