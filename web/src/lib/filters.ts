export interface AdvancedFilterState {
  roomCount: string[]; // e.g. ['1', '2', '3', '4+']
  apartmentRange: string; // 'all' | '1-50' | '51-100' | '101-200' | '200+'
  floorRange: string; // 'all' | '1-5' | '6-9' | '10-16' | '16+'
  visitStatus: 'all' | 'visited' | 'not_visited';
  crmStatus: 'all' | 'filled' | 'empty';
  difficulty: string; // 'all' | 'II' | 'III' | 'IV'
  deadlineYear: string; // 'all' | '2024' | '2025' | '2026' | '2027+'
}

export const INITIAL_ADVANCED_FILTERS: AdvancedFilterState = {
  roomCount: [],
  apartmentRange: 'all',
  floorRange: 'all',
  visitStatus: 'all',
  crmStatus: 'all',
  difficulty: 'all',
  deadlineYear: 'all'
};

export function countActiveFilters(filters: AdvancedFilterState): number {
  let count = 0;
  if (filters.roomCount && filters.roomCount.length > 0) count += filters.roomCount.length;
  if (filters.apartmentRange && filters.apartmentRange !== 'all') count += 1;
  if (filters.floorRange && filters.floorRange !== 'all') count += 1;
  if (filters.visitStatus && filters.visitStatus !== 'all') count += 1;
  if (filters.crmStatus && filters.crmStatus !== 'all') count += 1;
  if (filters.difficulty && filters.difficulty !== 'all') count += 1;
  if (filters.deadlineYear && filters.deadlineYear !== 'all') count += 1;
  return count;
}
