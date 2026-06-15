/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface F1Team {
  id: string; // e.g. "RBR", "MER"
  name: string; // e.g. "Red Bull Racing"
  color: string; // Hex color code
  textColor: string; // "text-black" or "text-white" depending on brightness
}

export interface F1Driver {
  id: string; // e.g. "VER", "HAM"
  name: string;
  teamId: string; // Mapped to team
}

export interface GridSquare {
  id: string; // unique instance id or team/driver id
  type: 'team' | 'driver';
  code: string; // e.g. "MER", "HAM", "GAS"
  name: string; // full human name
  color: string; // color hex from team
  textColor: string; // text-black or text-white
  teamId: string;
  isDouble?: boolean;
}

export interface DraggedItem {
  id: string;
  type: 'team' | 'driver';
  code: string;
  name: string;
  color: string;
  textColor: string;
  teamId: string;
  source: 'pool' | { row: number; col: number };
  isDouble?: boolean;
}
