/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GridSquare } from '../types';
import { SquareItem } from './SquareItem';

interface GridCellProps {
  row: number;
  col: number;
  item: GridSquare | null;
  onDrop: (row: number, col: number, isCopy?: boolean) => void;
  onDragStartItem: (e: React.DragEvent, item: GridSquare, source: { row: number; col: number }) => void;
  onDragEndItem: () => void;
  onRemoveItem: (row: number, col: number) => void;
  onClickItem?: (row: number, col: number) => void;
  highlightedRow?: number | null;
  highlightedCol?: number | null;
  isSelected?: boolean;
  onSelectCell?: (row: number, col: number) => void;
  price?: number | null;
}

export const GridCell: React.FC<GridCellProps> = ({
  row,
  col,
  item,
  onDrop,
  onDragStartItem,
  onDragEndItem,
  onRemoveItem,
  onClickItem,
  highlightedRow,
  highlightedCol,
  isSelected = false,
  onSelectCell,
  price,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && cellRef.current) {
      cellRef.current.focus();
    }
  }, [isSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop(row, col, e.shiftKey);
  };

  // Check if this cell's row or col is highlighted to draw coordinate projection lines
  const isRowHighlighted = highlightedRow === row;
  const isColHighlighted = highlightedCol === col;

  return (
    <div
      ref={cellRef}
      tabIndex={0}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (onSelectCell) onSelectCell(row, col);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onSelectCell) onSelectCell(row, col);
        }
      }}
      className={`
        w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12
        rounded-xl
        relative
        flex
        items-center
        justify-center
        transition-all
        duration-150
        cursor-pointer
        focus:outline-none
        ${
          item
            ? 'p-0 bg-transparent'
            : isDragOver
            ? 'bg-[#2f3139] ring-2 ring-white/50 scale-102 shadow-inner'
            : isRowHighlighted || isColHighlighted
            ? 'bg-[#292a30]'
            : 'bg-[#24252a] hover:bg-[#2c2d33]'
        }
      `}
      id={`cell-${row}-${col}`}
    >
      {item ? (
        <SquareItem
          item={item}
          onDragStart={(e, dItem) => onDragStartItem(e, dItem, { row, col })}
          onDragEnd={onDragEndItem}
          onDoubleClick={() => onRemoveItem(row, col)}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectCell) onSelectCell(row, col);
            if (onClickItem) onClickItem(row, col);
          }}
          price={price}
        />
      ) : (
        // Subtle dot in empty cells for high quality grid visualization
        <span className="w-1 h-1 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors pointer-events-none" />
      )}
    </div>
  );
};
