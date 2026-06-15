/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GridSquare } from '../types';

interface SquareItemProps {
  item: GridSquare;
  onDragStart: (e: React.DragEvent, item: GridSquare) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  onDoubleClick?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  sizeClass?: string;
  price?: number | null;
}

export const SquareItem: React.FC<SquareItemProps> = ({
  item,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onDoubleClick,
  onClick,
  sizeClass = 'w-full h-full',
  price,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    // Set both custom state and standard drag data transfer for browser compatibility
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    onDragStart(e, item);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      className={`
        ${sizeClass}
        rounded-xl
        flex
        items-center
        justify-center
        font-mono
        font-bold
        text-xs
        sm:text-sm
        tracking-wider
        shadow-lg
        cursor-grab
        active:cursor-grabbing
        transition-all
        duration-200
        select-none
        relative
        group
        ${item.textColor || 'text-white'}
        ${isDragging ? 'opacity-40 scale-95 shadow-none' : 'opacity-100 scale-100 hover:scale-105 active:scale-95'}
      `}
      style={{
        backgroundColor: item.color,
      }}
      id={`square-${item.type}-${item.code}`}
    >
      {price != null ? (
        <span className="relative z-10 flex flex-col items-center leading-none gap-px">
          <span className="text-[10px] sm:text-[11px] font-black">{item.code}</span>
          <span className="text-[7px] sm:text-[8px] font-semibold opacity-80">{price.toFixed(1)}</span>
        </span>
      ) : (
        <span className="relative z-10">{item.code}</span>
      )}
      
      {/* 2X Badge on the top-left */}
      {item.isDouble && (
        <span className="absolute top-1 left-1 bg-black/80 text-white font-mono font-black text-[7px] sm:text-[9px] px-1 py-0.5 rounded border border-white/10 shadow leading-none select-none z-20">
          2X
        </span>
      )}

      {/* Soft overlay gradient for F1 dynamic glossy look */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-black/20 via-transparent to-white/10 opacity-100 z-0 pointer-events-none" />
      
      {/* Tiny clean delete indicator shown on hover inside placed grids */}
      {onDoubleClick && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[8px] text-white">
          ×
        </div>
      )}
    </div>
  );
};
