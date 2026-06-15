/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GridSquare, DraggedItem } from './types';
import { GRID_COLS, GRID_ROWS, FINANCE_COLS, F1_TEAMS, F1_DRIVERS } from './constants';
import { Grid } from './components/Grid';
import { StatsGrid } from './components/StatsGrid';

const DEFAULT_STARTING_PRICES: Record<string, string> = {
  'team-MER': '29.3', 'team-FER': '23.3', 'team-MCL': '28.9', 'team-RBR': '28.2',
  'team-AST': '10.3', 'team-ALP': '12.5', 'team-RBA': '6.3',  'team-HAA': '7.4',
  'team-WIL': '12',   'team-AUD': '6.6',  'team-CAD': '6',
  'driver-RUS': '27.4', 'driver-ANT': '23.2', 'driver-LEC': '22.8', 'driver-HAM': '22.5',
  'driver-NOR': '27.2', 'driver-PIA': '25.5', 'driver-VER': '27.7', 'driver-HAD': '15.1',
  'driver-ALO': '10',   'driver-STR': '8',    'driver-GAS': '12',   'driver-COL': '6.2',
  'driver-LAW': '6.5',  'driver-LIN': '6.2',  'driver-OCO': '7.3',  'driver-BEA': '7.4',
  'driver-ALB': '11.6', 'driver-SAI': '11.8', 'driver-HUL': '6.8',  'driver-BOR': '6.4',
  'driver-PER': '6',    'driver-BOT': '5.9',
};

export default function App() {
  // Initialize grid from localStorage or empty
  const [grid, setGrid] = useState<(GridSquare | null)[][]>(() => {
    // Coerce any persisted grid (which may have been saved at a different
    // column/row count) into the current GRID_ROWS x GRID_COLS shape.
    const normalize = (raw: (GridSquare | null)[][]): (GridSquare | null)[][] =>
      Array.from({ length: GRID_ROWS }, (_, r) =>
        Array.from({ length: GRID_COLS }, (_, c) => raw?.[r]?.[c] ?? null)
      );

    const saved = localStorage.getItem('f1-planner-grid');
    if (saved) {
      try {
        return normalize(JSON.parse(saved));
      } catch (e) {
        // Fallback to empty
      }
    }
    return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
  });

  // Track the board title
  const [title, setTitle] = useState(() => {
    return localStorage.getItem('f1-planner-title') || 'February Weekend Grid';
  });

  // Active drag item state
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);

  // Warning toast when drop is invalid
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Track Shift key state via keydown/keyup — e.shiftKey on drop events is unreliable on macOS
  const isShiftHeldRef = useRef(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftHeldRef.current = true; };
    const onUp   = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftHeldRef.current = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // Selected cell state for keydown placing/cycling
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Stats input grid values
  const [stats, setStats] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('f1-planner-stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to empty
      }
    }
    return {};
  });

  // Finance input grid values — seeded with default pre-season prices in column 00
  const [financeStats, setFinanceStats] = useState<Record<string, string[]>>(() => {
    const makeDefaults = (): Record<string, string[]> => {
      const out: Record<string, string[]> = {};
      Object.entries(DEFAULT_STARTING_PRICES).forEach(([id, price]) => {
        out[id] = [price, ...Array(FINANCE_COLS - 1).fill('')];
      });
      return out;
    };

    const defaults = makeDefaults();
    const saved = localStorage.getItem('f1-planner-finance-stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, string[]>;
        // Overlay saved data on top of defaults; backfill col 00 from defaults if empty
        const merged: Record<string, string[]> = { ...defaults };
        Object.entries(parsed).forEach(([id, values]) => {
          const arr = Array.from({ length: FINANCE_COLS }, (_, i) => (values[i] ?? ''));
          if (!arr[0] && defaults[id]?.[0]) arr[0] = defaults[id][0];
          merged[id] = arr;
        });
        return merged;
      } catch {
        // fall through to defaults
      }
    }
    return defaults;
  });

  // Auto-hide warning message
  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => {
        setWarningMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [warningMessage]);
  // Synchronize main grid, stats and title to localStorage on change
  useEffect(() => {
    localStorage.setItem('f1-planner-grid', JSON.stringify(grid));
  }, [grid]);

  useEffect(() => {
    localStorage.setItem('f1-planner-title', title);
  }, [title]);

  useEffect(() => {
    localStorage.setItem('f1-planner-stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('f1-planner-finance-stats', JSON.stringify(financeStats));
  }, [financeStats]);

  // Compute all potential 33 squares ordered nicely
  const allSquares = useMemo(() => {
    const list: GridSquare[] = [];
    
    // Add 11 teams
    F1_TEAMS.forEach((team) => {
      list.push({
        id: `team-${team.id}`,
        type: 'team',
        code: team.id,
        name: team.name,
        color: team.color,
        textColor: team.textColor,
        teamId: team.id,
      });
    });

    // Add 22 drivers
    F1_DRIVERS.forEach((driver) => {
      const team = F1_TEAMS.find((t) => t.id === driver.teamId);
      if (team) {
        list.push({
          id: `driver-${driver.id}`,
          type: 'driver',
          code: driver.id,
          name: driver.name,
          color: team.color,
          textColor: team.textColor,
          teamId: driver.teamId,
        });
      }
    });

    return list;
  }, []);

  // Auto-compute post-race prices for all assets using the F1 Fantasy pricing algorithm
  const computedMonetary = useMemo(() => {
    const result: Record<string, (number | null)[]> = {};

    allSquares.forEach((sq) => {
      const startPrice = parseFloat(financeStats[sq.id]?.[0] || '');
      if (isNaN(startPrice) || startPrice <= 0) {
        result[sq.id] = Array(GRID_COLS).fill(null);
        return;
      }

      const prices: number[] = [startPrice];
      const ppmHistory: number[] = [];

      for (let raceIdx = 0; raceIdx < GRID_COLS; raceIdx++) {
        const prevPrice = prices[raceIdx];
        const pointsStr = stats[sq.id]?.[raceIdx];
        if (pointsStr === undefined || pointsStr === '') break;

        const points = parseFloat(pointsStr) || 0;
        const ppm = points / prevPrice;
        ppmHistory.push(ppm);

        const raceNum = raceIdx + 1;
        const p3 = ppm;
        const p2 = ppmHistory.length >= 2 ? ppmHistory[ppmHistory.length - 2] : 0;
        const p1 = ppmHistory.length >= 3 ? ppmHistory[ppmHistory.length - 3] : 0;
        const avgPPM = (p1 + p2 + p3) / 3;

        const thresholds: [number, number, number] =
          raceNum === 2 ? [0.4, 0.6, 0.8] : [0.2, 0.3, 0.4];

        const isTierA = prevPrice > 18.5;
        let delta: number;
        if (avgPPM >= thresholds[2])      delta = isTierA ? 0.3 : 0.6;
        else if (avgPPM >= thresholds[1]) delta = isTierA ? 0.1 : 0.2;
        else if (avgPPM >= thresholds[0]) delta = isTierA ? -0.1 : -0.2;
        else                              delta = isTierA ? -0.3 : -0.6;

        prices.push(Math.max(Math.round((prevPrice + delta) * 10) / 10, 0.1));
      }

      const computed = prices.length - 1;
      result[sq.id] = Array.from({ length: GRID_COLS }, (_, i) =>
        i < computed ? prices[i + 1] : null
      );
    });

    return result;
  }, [allSquares, stats, financeStats]);

  // Display price: post-race price for this column if stats exist, else most recent computed price.
  // Used for $ row and cell tile labels — shows "current worth" of each asset.
  const getAssetPrice = (baseId: string, colIdx: number): number => {
    for (let i = colIdx; i >= 0; i--) {
      const p = computedMonetary[baseId]?.[i];
      if (p !== null && p !== undefined) return p;
    }
    return parseFloat(financeStats[baseId]?.[0] || '') || 0;
  };

  // Entry price: what you actually pay/receive at each race boundary.
  // Race 1 (colIdx=0): always starting price. Race N: post-race-(N-1) price, else starting price.
  // Used exclusively in the budget calculation to correctly track financial P&L.
  const getEntryPrice = (baseId: string, colIdx: number): number => {
    const startingPrice = parseFloat(financeStats[baseId]?.[0] || '') || 0;
    if (colIdx === 0) return startingPrice;
    for (let i = colIdx - 1; i >= 0; i--) {
      const p = computedMonetary[baseId]?.[i];
      if (p !== null && p !== undefined) return p;
    }
    return startingPrice;
  };

  // Total cost of placed assets per column
  const columnCosts = useMemo(() => {
    return Array.from({ length: GRID_COLS }, (_, colIdx) => {
      let sum = 0;
      for (let rowIdx = 0; rowIdx < GRID_ROWS; rowIdx++) {
        const cell = grid[rowIdx][colIdx];
        if (!cell) continue;
        const baseId = cell.id.split('-col-')[0];
        sum += getAssetPrice(baseId, colIdx);
      }
      return Math.round(sum * 10) / 10;
    });
  }, [grid, financeStats, computedMonetary]);

  // Entry-price column costs — used for budget cap checks (what you actually paid, not market value)
  const columnCostsEntry = useMemo(() => {
    return Array.from({ length: GRID_COLS }, (_, colIdx) => {
      let sum = 0;
      for (let rowIdx = 0; rowIdx < GRID_ROWS; rowIdx++) {
        const cell = grid[rowIdx][colIdx];
        if (!cell) continue;
        const baseId = cell.id.split('-col-')[0];
        sum += getEntryPrice(baseId, colIdx);
      }
      return Math.round(sum * 10) / 10;
    });
  }, [grid, financeStats, computedMonetary]);

  // Bank-based budget: starts at 100, tracks profits/losses across column transitions
  const budget = useMemo(() => {
    const isComplete = (c: number) => {
      let teams = 0, drivers = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        const cell = grid[r][c];
        if (cell?.type === 'team') teams++;
        else if (cell?.type === 'driver') drivers++;
      }
      return teams === 2 && drivers === 5;
    };

    // Active column = rightmost col that is col 0, or whose left neighbour is complete
    let activeCol = 0;
    for (let c = GRID_COLS - 1; c >= 0; c--) {
      if (c === 0 || isComplete(c - 1)) { activeCol = c; break; }
    }

    // Start with full bank, subtract initial purchase cost at starting prices (race 1 entry)
    let bank = 100;
    for (let r = 0; r < GRID_ROWS; r++) {
      const cell = grid[r][0];
      if (cell) bank -= getEntryPrice(cell.id.split('-col-')[0], 0);
    }

    // Walk each transition: sold assets return at post-race prices, bought assets cost post-race prices
    for (let c = 0; c < activeCol; c++) {
      const inC = new Set<string>();
      const inC1 = new Set<string>();
      for (let r = 0; r < GRID_ROWS; r++) {
        const a = grid[r][c];     if (a) inC.add(a.id.split('-col-')[0]);
        const b = grid[r][c + 1]; if (b) inC1.add(b.id.split('-col-')[0]);
      }
      inC.forEach(id  => { if (!inC1.has(id)) bank += getEntryPrice(id, c + 1); });
      inC1.forEach(id => { if (!inC.has(id))  bank -= getEntryPrice(id, c + 1); });
    }

    return parseFloat(bank.toFixed(1));
  }, [grid, computedMonetary, financeStats]);

  // Reserves = cash not invested in assets. Tracks actual cash flow only — no paper gains.
  // Decreases as assets are added to the current column; never rises from price appreciation.
  const reserves = useMemo(() => {
    const isComplete = (c: number) => {
      let teams = 0, drivers = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        const cell = grid[r][c];
        if (cell?.type === 'team') teams++;
        else if (cell?.type === 'driver') drivers++;
      }
      return teams === 2 && drivers === 5;
    };
    let activeCol = 0;
    for (let c = GRID_COLS - 1; c >= 0; c--) {
      if (c === 0 || isComplete(c - 1)) { activeCol = c; break; }
    }

    let cash = 100;
    for (let r = 0; r < GRID_ROWS; r++) {
      const cell = grid[r][0];
      if (cell) cash -= getEntryPrice(cell.id.split('-col-')[0], 0);
    }

    // Only process transitions where the next column actually has assets.
    // An empty next column means no transfers have been made — paper gains not credited.
    for (let c = 0; c < activeCol; c++) {
      let nextHasAssets = false;
      for (let r = 0; r < GRID_ROWS; r++) {
        if (grid[r][c + 1]) { nextHasAssets = true; break; }
      }
      if (!nextHasAssets) break;

      const inC = new Set<string>();
      const inC1 = new Set<string>();
      for (let r = 0; r < GRID_ROWS; r++) {
        const a = grid[r][c];     if (a) inC.add(a.id.split('-col-')[0]);
        const b = grid[r][c + 1]; if (b) inC1.add(b.id.split('-col-')[0]);
      }
      inC.forEach(id  => { if (!inC1.has(id)) cash += getEntryPrice(id, c + 1); });
      inC1.forEach(id => { if (!inC.has(id))  cash -= getEntryPrice(id, c + 1); });
    }

    return parseFloat(cash.toFixed(1));
  }, [grid, computedMonetary, financeStats]);

  // Set of pool square IDs that cost more than current reserves — used to dim unaffordable tiles
  const unaffordableIds = useMemo(() => {
    const isComplete = (c: number) => {
      let teams = 0, drivers = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        const cell = grid[r][c];
        if (cell?.type === 'team') teams++;
        else if (cell?.type === 'driver') drivers++;
      }
      return teams === 2 && drivers === 5;
    };
    let activeCol = 0;
    for (let c = GRID_COLS - 1; c >= 0; c--) {
      if (c === 0 || isComplete(c - 1)) { activeCol = c; break; }
    }

    const activeColHasAssets = grid.some(row => row[activeCol] !== null);
    if (!activeColHasAssets) return new Set<string>();

    let driverCount = 0, teamCount = 0;
    const placedBaseIds = new Set<string>();
    for (let r = 0; r < GRID_ROWS; r++) {
      const cell = grid[r][activeCol];
      if (!cell) continue;
      const baseId = cell.id.split('-col-')[0];
      placedBaseIds.add(baseId);
      if (cell.type === 'driver') driverCount++;
      else if (cell.type === 'team') teamCount++;
    }

    const set = new Set<string>();
    for (const sq of allSquares) {
      if (placedBaseIds.has(sq.id)) { set.add(sq.id); continue; }
      if (sq.type === 'driver' && driverCount >= 5) { set.add(sq.id); continue; }
      if (sq.type === 'team' && teamCount >= 2) { set.add(sq.id); continue; }
      if (getEntryPrice(sq.id, activeCol) > reserves) set.add(sq.id);
    }
    return set;
  }, [allSquares, grid, computedMonetary, financeStats, reserves]);

  // Listen for global key presses to support quick-place key shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      // Ignore if user is typing in any input element (e.g. title editor, stats inputs)
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        setSelectedCell(null);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleRemoveItem(selectedCell.row, selectedCell.col);
        return;
      }

      const keyChar = e.key.toUpperCase();
      if (keyChar.length === 1 && keyChar >= 'A' && keyChar <= 'Z') {
        e.preventDefault();
        
        // Find all paddock pool items whose code starts with keyChar
        // Sorted alphabetically!
        const matchingSquares = allSquares
          .filter((sq) => sq.code.toUpperCase().startsWith(keyChar))
          .sort((a, b) => a.code.localeCompare(b.code));

        if (matchingSquares.length === 0) return;

        // Current item in the selected cell
        const currentItem = grid[selectedCell.row][selectedCell.col];
        
        // We want to find the next item in alphabetical order that is NOT a duplicate in this column.
        // Begin search from the next item of current, or 0 if it's empty or has a different letter.
        let startIndex = 0;
        if (currentItem && currentItem.code.toUpperCase().startsWith(keyChar)) {
          const idx = matchingSquares.findIndex((sq) => sq.code === currentItem.code);
          if (idx !== -1) {
            startIndex = (idx + 1) % matchingSquares.length;
          }
        }

        let foundSquare: GridSquare | null = null;
        for (let i = 0; i < matchingSquares.length; i++) {
          const candidateIdx = (startIndex + i) % matchingSquares.length;
          const candidate = matchingSquares[candidateIdx];

          // Check if duplicate in column (excluding the selected cell's row itself)
          const isDuplicate = grid.some((rowData, rIdx) => {
            if (rIdx === selectedCell.row) return false;
            return rowData[selectedCell.col]?.code === candidate.code;
          });

          if (isDuplicate) continue;

          // Check column type limits (2 teams, 5 drivers)
          const typeLimit = candidate.type === 'team' ? 2 : 5;
          const typeCount = grid.filter((rowData, rIdx) => rIdx !== selectedCell.row && rowData[selectedCell.col]?.type === candidate.type).length;
          if (typeCount >= typeLimit) continue;

          // Check budget using entry prices (what you'd actually pay, not market value)
          const candidateBaseId = candidate.id.split('-col-')[0];
          const candidatePrice = getEntryPrice(candidateBaseId, selectedCell.col);
          const currentBaseId2 = currentItem ? currentItem.id.split('-col-')[0] : null;
          const currentPrice2 = currentBaseId2 ? getEntryPrice(currentBaseId2, selectedCell.col) : 0;
          const projectedCost = Math.round((columnCostsEntry[selectedCell.col] - currentPrice2 + candidatePrice) * 10) / 10;
          if (projectedCost > budget + columnCostsEntry[selectedCell.col]) continue;

          foundSquare = candidate;
          break;
        }

        if (foundSquare) {
          const baseId = foundSquare.id.split('-col-')[0];
          const uniquePlacementId = `${baseId}-col-${selectedCell.col}`;

          // Carry 2x forward: if this asset was 2x in the previous column, auto-assign 2x here
          let isDoubleFinal = currentItem ? currentItem.isDouble : false;
          if (!isDoubleFinal && selectedCell.col > 0) {
            for (let r = 0; r < GRID_ROWS; r++) {
              const prevCell = grid[r][selectedCell.col - 1];
              if (prevCell && prevCell.id.split('-col-')[0] === baseId && prevCell.isDouble) {
                isDoubleFinal = true;
                break;
              }
            }
          }

          const itemToPlace: GridSquare = {
            ...foundSquare,
            id: uniquePlacementId,
            isDouble: isDoubleFinal,
          };

          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((r) => [...r]);

            // If the item we are placing is double, ensure any other 2x asset in the same column is cleared
            if (itemToPlace.isDouble) {
              newGrid.forEach((r, rIdx) => {
                if (rIdx !== selectedCell.row && r[selectedCell.col]) {
                  r[selectedCell.col] = {
                    ...r[selectedCell.col]!,
                    isDouble: false,
                  };
                }
              });
            }

            newGrid[selectedCell.row][selectedCell.col] = itemToPlace;

            // Fallback: once all 5 drivers are placed and still no 2x, assign to highest-scoring driver
            const col = selectedCell.col;
            const driverCount = newGrid.filter((row: (GridSquare | null)[]) => row[col]?.type === 'driver').length;
            if (driverCount === 5 && !newGrid.some((row: (GridSquare | null)[]) => row[col]?.isDouble)) {
              let bestRow = -1, bestAvg = -Infinity;
              for (let r = 0; r < GRID_ROWS; r++) {
                const cell = newGrid[r][col];
                if (!cell || cell.type !== 'driver') continue;
                const id = cell.id.split('-col-')[0];
                let sum = 0, count = 0;
                for (let race = 0; race < col; race++) {
                  const v = parseFloat(stats[id]?.[race] || '');
                  if (!isNaN(v)) { sum += v; count++; }
                }
                const avg = count > 0 ? sum / count : 0;
                if (avg > bestAvg) { bestAvg = avg; bestRow = r; }
              }
              if (bestRow >= 0) {
                newGrid[bestRow][col] = { ...newGrid[bestRow][col]!, isDouble: true };
              }
            }

            return newGrid;
          });
          setWarningMessage(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selectedCell, grid, allSquares, columnCosts, computedMonetary, financeStats, stats]);

  // Compute which original base IDs are already placed on the grid
  const placedIds = useMemo(() => {
    const ids = new Set<string>();
    grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell) {
          // Extract the original base id (e.g. "driver-HAM" from "driver-HAM-col-2")
          const baseId = cell.id.split('-col-')[0];
          ids.add(baseId);
        }
      });
    });
    return ids;
  }, [grid]);


  // Per-asset, per-race point thresholds for the 4 price-change outcomes
  // [minGreat, minGood, minPoor, maxTerrible] — computed for all 24 races including future ones
  const priceThresholds = useMemo(() => {
    const result: Record<string, ([number, number, number, number] | null)[]> = {};

    allSquares.forEach((sq) => {
      const startPrice = parseFloat(financeStats[sq.id]?.[0] || '');
      if (isNaN(startPrice) || startPrice <= 0) {
        result[sq.id] = Array(GRID_COLS).fill(null);
        return;
      }

      let price = startPrice;
      const ppmHistory: number[] = [];
      const arr: ([number, number, number, number] | null)[] = [];

      for (let raceIdx = 0; raceIdx < GRID_COLS; raceIdx++) {
        const raceNum = raceIdx + 1;
        const ppm2 = ppmHistory.length >= 2 ? ppmHistory[ppmHistory.length - 2] : 0;
        const ppm1 = ppmHistory.length >= 1 ? ppmHistory[ppmHistory.length - 1] : 0;
        const sumPrev = ppm2 + ppm1;

        const t: [number, number, number] = raceNum === 2 ? [0.4, 0.6, 0.8] : [0.2, 0.3, 0.4];

        const minPoor     = Math.ceil(price * (3 * t[0] - sumPrev));
        const minGood     = Math.ceil(price * (3 * t[1] - sumPrev));
        const minGreat    = Math.ceil(price * (3 * t[2] - sumPrev));
        const maxTerrible = minPoor - 1;

        arr.push([minGreat, minGood, minPoor, maxTerrible]);

        // If race data exists, update price + ppm history for next iteration
        const pointsStr = stats[sq.id]?.[raceIdx];
        if (pointsStr !== undefined && pointsStr !== '') {
          const points = parseFloat(pointsStr) || 0;
          const ppm = points / price;
          ppmHistory.push(ppm);

          const avgPPM = (ppm2 + ppm1 + ppm) / 3;
          const isTierA = price > 18.5;
          let delta: number;
          if (avgPPM >= t[2])      delta = isTierA ? 0.3 : 0.6;
          else if (avgPPM >= t[1]) delta = isTierA ? 0.1 : 0.2;
          else if (avgPPM >= t[0]) delta = isTierA ? -0.1 : -0.2;
          else                     delta = isTierA ? -0.3 : -0.6;

          price = Math.max(Math.round((price + delta) * 10) / 10, 0.1);
        }
      }

      result[sq.id] = arr;
    });

    return result;
  }, [allSquares, stats, financeStats]);

  // Total fantasy points per column (for TOT row)
  const columnTotals = useMemo(() => {
    const totals = Array(GRID_COLS).fill(0);
    for (let colIdx = 0; colIdx < GRID_COLS; colIdx++) {
      let sum = 0;
      for (let rowIdx = 0; rowIdx < GRID_ROWS; rowIdx++) {
        const cell = grid[rowIdx][colIdx];
        if (cell) {
          const baseId = cell.id.split('-col-')[0];
          const values = stats[baseId];
          if (values && values[colIdx]) {
            const val = parseFloat(values[colIdx]);
            if (!isNaN(val)) sum += val * (cell.isDouble ? 2 : 1);
          }
        }
      }
      totals[colIdx] = Math.round(sum * 10) / 10;
    }
    return totals;
  }, [grid, stats]);

  // Handle Drag Start from Paddock Pool
  const handleDragStartFromPool = (e: React.DragEvent, sq: GridSquare) => {
    setDraggedItem({
      id: sq.id,
      type: sq.type,
      code: sq.code,
      name: sq.name,
      color: sq.color,
      textColor: sq.textColor,
      teamId: sq.teamId,
      source: 'pool',
      isDouble: sq.isDouble,
    });
  };

  // Handle Drag Start from an existing Grid Cell
  const handleDragStartFromGrid = (
    e: React.DragEvent,
    sq: GridSquare,
    source: { row: number; col: number }
  ) => {
    setDraggedItem({
      id: sq.id,
      type: sq.type,
      code: sq.code,
      name: sq.name,
      color: sq.color,
      textColor: sq.textColor,
      teamId: sq.teamId,
      source,
      isDouble: sq.isDouble,
    });
  };

  // Drop action target on grid cell (targetRow, targetCol)
  const handleDropItem = (targetRow: number, targetCol: number, isCopy: boolean = false) => {
    isCopy = isCopy || isShiftHeldRef.current;
    if (!draggedItem) return;

    const source = draggedItem.source;
    const baseId = draggedItem.id.split('-col-')[0];
    // Key-assign item with target column suffix so it does not conflict key-renders
    const uniquePlacementId = `${baseId}-col-${targetCol}`;

    // Carry 2x forward: if this asset was 2x in the previous column, auto-assign 2x here
    let isDoubleFinal = draggedItem.isDouble;
    if (!isDoubleFinal && targetCol > 0) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const prevCell = grid[r][targetCol - 1];
        if (prevCell && prevCell.id.split('-col-')[0] === baseId && prevCell.isDouble) {
          isDoubleFinal = true;
          break;
        }
      }
    }

    const itemToPlace: GridSquare = {
      id: uniquePlacementId,
      type: draggedItem.type,
      code: draggedItem.code,
      name: draggedItem.name,
      color: draggedItem.color,
      textColor: draggedItem.textColor,
      teamId: draggedItem.teamId,
      isDouble: isDoubleFinal,
    };

    // Check if the same code is already present inside key columns to respect constraints
    const isDuplicateInColumn = grid.some((rowData, rIdx) => {
      // For a genuine move (not a copy) within the same column, skip the source row —
      // the original will be displaced, so it's not a real duplicate.
      // When isCopy is true the original stays, so we must NOT skip it.
      if (!isCopy && source !== 'pool' && (source as { row: number; col: number }).col === targetCol && (source as { row: number; col: number }).row === rIdx) {
        return false;
      }
      return rowData[targetCol]?.code === itemToPlace.code;
    });

    if (isDuplicateInColumn) {
      setWarningMessage(`Cannot place ${itemToPlace.code} twice in the same column.`);
      setDraggedItem(null);
      return;
    }

    // Check column type limits (2 teams, 5 drivers) — skip for same-column swaps (not copies)
    const isSameColumnMove = !isCopy && source !== 'pool' && (source as { row: number; col: number }).col === targetCol;
    if (!isSameColumnMove) {
      const typeLimit = itemToPlace.type === 'team' ? 2 : 5;
      const typeCount = grid.filter((rowData, rIdx) => rIdx !== targetRow && rowData[targetCol]?.type === itemToPlace.type).length;
      if (typeCount >= typeLimit) {
        const label = itemToPlace.type === 'team' ? 'teams' : 'drivers';
        setWarningMessage(`Column ${(targetCol + 1).toString().padStart(2, '0')} already has ${typeLimit} ${label}.`);
        setDraggedItem(null);
        return;
      }
    }

    // Budget check — skip for same-column swaps (net cost is zero)
    if (!isSameColumnMove) {
      const newPrice = getEntryPrice(baseId, targetCol);
      const displacedCell = grid[targetRow][targetCol];
      const displacedPrice = displacedCell ? getEntryPrice(displacedCell.id.split('-col-')[0], targetCol) : 0;
      const newColCost = Math.round((columnCostsEntry[targetCol] - displacedPrice + newPrice) * 10) / 10;
      const colCap = Math.round((columnCostsEntry[targetCol] + budget) * 10) / 10;
      if (newColCost > colCap) {
        setWarningMessage(`Over budget — ${itemToPlace.code} would bring column cost to ${newColCost.toFixed(1)} (cap: ${colCap.toFixed(1)}).`);
        setDraggedItem(null);
        return;
      }
    }

    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((r) => [...r]);
      const displacedItem = newGrid[targetRow][targetCol];

      if (itemToPlace.isDouble) {
        // Automatically switch 2X multiplier of the column to the newly placed item
        newGrid.forEach((r, rIdx) => {
          if (rIdx !== targetRow && r[targetCol]) {
            r[targetCol] = {
              ...r[targetCol]!,
              isDouble: false,
            };
          }
        });
      }

      if (source === 'pool' || isCopy) {
        // Pool drag or Shift+copy: just place, leave source untouched
        newGrid[targetRow][targetCol] = itemToPlace;
      } else {
        // Normal grid move: swap displaced item back to source cell
        const { row: sRow, col: sCol } = source;
        newGrid[sRow][sCol] = displacedItem;
        newGrid[targetRow][targetCol] = itemToPlace;
      }

      // Fallback: once all 5 drivers are placed and still no 2x, assign to highest-scoring driver
      const driverCount = newGrid.filter((row: (GridSquare | null)[]) => row[targetCol]?.type === 'driver').length;
      if (driverCount === 5 && !newGrid.some((row: (GridSquare | null)[]) => row[targetCol]?.isDouble)) {
        let bestRow = -1, bestAvg = -Infinity;
        for (let r = 0; r < GRID_ROWS; r++) {
          const cell = newGrid[r][targetCol];
          if (!cell || cell.type !== 'driver') continue;
          const id = cell.id.split('-col-')[0];
          let sum = 0, count = 0;
          for (let race = 0; race < targetCol; race++) {
            const v = parseFloat(stats[id]?.[race] || '');
            if (!isNaN(v)) { sum += v; count++; }
          }
          const avg = count > 0 ? sum / count : 0;
          if (avg > bestAvg) { bestAvg = avg; bestRow = r; }
        }
        if (bestRow >= 0) {
          newGrid[bestRow][targetCol] = { ...newGrid[bestRow][targetCol]!, isDouble: true };
        }
      }

      return newGrid;
    });

    setDraggedItem(null);
  };

  // Handle double click or click to clear an individual slot
  const handleRemoveItem = (row: number, col: number) => {
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((r) => [...r]);
      newGrid[row][col] = null;
      return newGrid;
    });
  };

  // Toggle grid square 2x multiplier state on single click
  const handleToggleDoubleItem = (row: number, col: number) => {
    const cell = grid[row][col];
    if (cell?.type === 'team') return;
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((r) => [...r]);
      const cell = newGrid[row][col];
      if (cell) {
        const nextDoubleState = !cell.isDouble;
        if (nextDoubleState) {
          // Switch the 2x from other items in this column to this one, WITH NO WARNING
          newGrid.forEach((r, rIdx) => {
            if (rIdx !== row && r[col]) {
              r[col] = {
                ...r[col]!,
                isDouble: false,
              };
            }
          });
        }
        newGrid[row][col] = {
          ...cell,
          isDouble: nextDoubleState,
        };
      }
      return newGrid;
    });
  };

  // Handle individual input changes inside the StatsGrid
  const handleStatChange = (squareId: string, colIdx: number, value: string) => {
    setStats((prev) => {
      const currentValues = prev[squareId] ? [...prev[squareId]] : Array(GRID_COLS).fill('');
      currentValues[colIdx] = value;
      return {
        ...prev,
        [squareId]: currentValues,
      };
    });
  };

  // Handle individual input changes inside the Finance part of StatsGrid
  const handleFinanceStatChange = (squareId: string, colIdx: number, value: string) => {
    setFinanceStats((prev) => {
      const currentValues = prev[squareId] ? [...prev[squareId]] : Array(FINANCE_COLS).fill('');
      currentValues[colIdx] = value;
      return {
        ...prev,
        [squareId]: currentValues,
      };
    });
  };

  // Set drag over handler on the page backdrop to support dumping items back to the pool
  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem && draggedItem.source !== 'pool') {
      const { row, col } = draggedItem.source;
      handleRemoveItem(row, col);
      setDraggedItem(null);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handlePageDrop}
      className="min-h-screen bg-white text-gray-800 font-sans p-4 sm:p-8 flex flex-col items-center justify-start transition-colors duration-300 pointer-events-auto relative"
    >
      {/* Floating Warning Message Container */}
      {warningMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-red-500/30 text-white px-6 py-3.5 rounded-2xl shadow-2xl font-mono text-xs flex items-center gap-3 backdrop-blur-md animate-bounce">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Outer Shell Wrapper */}
      <div className="w-full flex flex-col gap-6">
        
        {/* 1. Main Grid Card Component */}
        <section className="w-full">
          <Grid
            grid={grid}
            onDropItem={handleDropItem}
            onDragStartItem={handleDragStartFromGrid}
            onDragEndItem={() => setDraggedItem(null)}
            onRemoveItem={handleRemoveItem}
            onClickItem={handleToggleDoubleItem}
            title={title}
            onTitleChange={setTitle}
            columnTotals={columnTotals}
            columnCosts={columnCosts}
            budget={budget}
            reserves={reserves}
            selectedCell={selectedCell}
            onSelectCell={(row, col) => setSelectedCell({ row, col })}
            computedMonetary={computedMonetary}
            allSquares={allSquares}
            placedIds={placedIds}
            unaffordableIds={unaffordableIds}
            onDragStartFromPool={handleDragStartFromPool}
            onDragEndFromPool={() => setDraggedItem(null)}
            draggedItemId={draggedItem ? draggedItem.id : null}
            onLoadSetup={setGrid}
          />
        </section>

        {/* 2. Stats Input Grid Component */}
        <section className="w-full">
          <StatsGrid
            squares={allSquares}
            stats={stats}
            onStatChange={handleStatChange}
            financeStats={financeStats}
            onFinanceStatChange={handleFinanceStatChange}
            computedMonetary={computedMonetary}
            priceThresholds={priceThresholds}
            onLoadStats={setStats}
          />
        </section>

      </div>
    </div>
  );
}
