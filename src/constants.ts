/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { F1Team, F1Driver } from './types';

export const GRID_COLS = 24; // 24 races in the season
export const GRID_ROWS = 7;

// Finance has one extra leading column (00) for the asset price before race 1,
// followed by one column per race.
export const FINANCE_COLS = GRID_COLS + 1; // 25

export const F1_TEAMS: F1Team[] = [
  { id: 'MER', name: 'Mercedes', color: '#2cd49f', textColor: 'text-black' }, // Mint teal
  { id: 'FER', name: 'Ferrari', color: '#ef1a2d', textColor: 'text-white' }, // Racing red
  { id: 'MCL', name: 'McLaren', color: '#ff8700', textColor: 'text-black' }, // Papaya orange
  { id: 'RBR', name: 'Red Bull Racing', color: '#121f45', textColor: 'text-white' }, // Navy blue
  { id: 'AST', name: 'Aston Martin', color: '#00594f', textColor: 'text-white' }, // Forest green
  { id: 'ALP', name: 'Alpine', color: '#ec4899', textColor: 'text-white' }, // Pink
  { id: 'RBA', name: 'Racing Bulls', color: '#1534cc', textColor: 'text-white' }, // Royal blue
  { id: 'HAA', name: 'Haas', color: '#eaeaea', textColor: 'text-black' }, // Light metallic grey
  { id: 'WIL', name: 'Williams', color: '#0024f0', textColor: 'text-white' }, // Deep blue
  { id: 'AUD', name: 'Audi', color: '#f5002c', textColor: 'text-white' }, // Audi Crimson
  { id: 'CAD', name: 'Cadillac', color: '#323438', textColor: 'text-white' }, // Premium gunmetal slate
];

export const F1_DRIVERS: F1Driver[] = [
  // Mercedes
  { id: 'RUS', name: 'George Russell', teamId: 'MER' },
  { id: 'ANT', name: 'Andrea Kimi Antonelli', teamId: 'MER' },
  
  // Ferrari
  { id: 'LEC', name: 'Charles Leclerc', teamId: 'FER' },
  { id: 'HAM', name: 'Lewis Hamilton', teamId: 'FER' },
  
  // McLaren
  { id: 'NOR', name: 'Lando Norris', teamId: 'MCL' },
  { id: 'PIA', name: 'Oscar Piastri', teamId: 'MCL' },
  
  // Red Bull Racing
  { id: 'VER', name: 'Max Verstappen', teamId: 'RBR' },
  { id: 'HAD', name: 'Isack Hadjar', teamId: 'RBR' },
  
  // Aston Martin
  { id: 'ALO', name: 'Fernando Alonso', teamId: 'AST' },
  { id: 'STR', name: 'Lance Stroll', teamId: 'AST' },
  
  // Alpine
  { id: 'GAS', name: 'Pierre Gasly', teamId: 'ALP' },
  { id: 'COL', name: 'Franco Colapinto', teamId: 'ALP' },
  
  // Racing Bulls
  { id: 'LAW', name: 'Liam Lawson', teamId: 'RBA' },
  { id: 'LIN', name: 'Arvid Lindblad', teamId: 'RBA' },
  
  // Haas
  { id: 'OCO', name: 'Esteban Ocon', teamId: 'HAA' },
  { id: 'BEA', name: 'Oliver Bearman', teamId: 'HAA' },
  
  // Williams
  { id: 'ALB', name: 'Alexander Albon', teamId: 'WIL' },
  { id: 'SAI', name: 'Carlos Sainz', teamId: 'WIL' },
  
  // Audi
  { id: 'HUL', name: 'Nico Hülkenberg', teamId: 'AUD' },
  { id: 'BOR', name: 'Gabriel Bortoleto', teamId: 'AUD' },
  
  // Cadillac
  { id: 'PER', name: 'Sergio Perez', teamId: 'CAD' },
  { id: 'BOT', name: 'Valtteri Bottas', teamId: 'CAD' },
];
