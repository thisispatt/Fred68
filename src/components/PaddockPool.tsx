/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GridSquare } from '../types';
import { SquareItem } from './SquareItem';
import { F1_TEAMS } from '../constants';

interface PaddockPoolProps {
  unplacedSquares: GridSquare[];
  placedIds: Set<string>;
  onDragStart: (e: React.DragEvent, item: GridSquare) => void;
  onDragEnd: () => void;
  draggedItemId: string | null;
}

export const PaddockPool: React.FC<PaddockPoolProps> = ({
  unplacedSquares,
  placedIds,
  onDragStart,
  onDragEnd,
  draggedItemId,
}) => {
  // Let's group all 33 potential squares by team.
  // We can build the full set of 33 squares first, then render them, showing them as low opacity if placed.
  const allSquaresMap = React.useMemo(() => {
    const map: Record<string, GridSquare[]> = {};
    F1_TEAMS.forEach((team) => {
      map[team.id] = [];
    });
    
    unplacedSquares.forEach((sq) => {
      if (!map[sq.teamId]) {
        map[sq.teamId] = [];
      }
      map[sq.teamId].push(sq);
    });

    // Make sure they are ordered: Teams first, then Drivers
    Object.keys(map).forEach((teamId) => {
      map[teamId].sort((a, b) => {
        if (a.type === b.type) return a.code.localeCompare(b.code);
        return a.type === 'team' ? -1 : 1;
      });
    });

    return map;
  }, [unplacedSquares]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
        <h3 className="text-white font-sans text-xl sm:text-2xl font-medium tracking-tight">
          Paddock
        </h3>
        <span className="text-xs font-mono text-gray-500">
          {placedIds.size} grid assignments
        </span>
      </div>

      {/* Grid of Team Rows - Exactly 3 columns on medium/larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {F1_TEAMS.map((team) => {
          // Get squares for this team
          const teamSquares = allSquaresMap[team.id] || [];
          
          return (
            <div
              key={team.id}
              className="bg-[#1e1f24] rounded-2xl p-4 border border-white/[0.03] hover:border-white/[0.08] transition-all duration-300"
            >
              {/* Team Name Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-400 truncate">
                  {team.name}
                </span>
              </div>

              {/* Rows of Squares: Team and Drivers */}
              <div className="flex items-center gap-3">
                {teamSquares.map((sq) => {
                  const isSelectedForDragging = draggedItemId === sq.id;

                  return (
                    <div key={sq.id} className="w-11 h-11 sm:w-12 sm:h-12 relative group">
                      <SquareItem
                        item={sq}
                        onDragStart={(e, item) => onDragStart(e, item)}
                        onDragEnd={onDragEnd}
                        isDragging={isSelectedForDragging}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
