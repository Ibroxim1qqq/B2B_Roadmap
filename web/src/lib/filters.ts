export interface AdvancedFilterState {
  roomCount: string; // custom room count string, e.g. '1', '2', '3', '4'
  minApartments: string; // e.g. '50'
  maxApartments: string; // e.g. '200'
  minFloors: string; // e.g. '5'
  maxFloors: string; // e.g. '12'
  visitStatus: 'all' | 'visited' | 'not_visited';
  crmStatus: 'all' | 'filled' | 'empty';
  difficulty: string; // 'all' | 'II' | 'III' | 'IV'
  deadlineYear: string; // e.g. '2026'
}

export const INITIAL_ADVANCED_FILTERS: AdvancedFilterState = {
  roomCount: '',
  minApartments: '',
  maxApartments: '',
  minFloors: '',
  maxFloors: '',
  visitStatus: 'all',
  crmStatus: 'all',
  difficulty: 'all',
  deadlineYear: ''
};

export function countActiveFilters(
  filters: AdvancedFilterState,
  selectedDistrict?: string,
  selectedStatus?: string
): number {
  let count = 0;
  if (filters.roomCount && filters.roomCount.trim() !== '') count += 1;
  if (filters.minApartments && filters.minApartments.trim() !== '') count += 1;
  if (filters.maxApartments && filters.maxApartments.trim() !== '') count += 1;
  if (filters.minFloors && filters.minFloors.trim() !== '') count += 1;
  if (filters.maxFloors && filters.maxFloors.trim() !== '') count += 1;
  if (filters.visitStatus && filters.visitStatus !== 'all') count += 1;
  if (filters.crmStatus && filters.crmStatus !== 'all') count += 1;
  if (filters.difficulty && filters.difficulty !== 'all') count += 1;
  if (filters.deadlineYear && filters.deadlineYear.trim() !== '' && filters.deadlineYear !== 'all') count += 1;
  if (selectedDistrict && selectedDistrict !== '' && selectedDistrict !== 'Barcha tumanlar') count += 1;
  if (selectedStatus && selectedStatus !== '' && selectedStatus !== 'Barcha statuslar') count += 1;
  return count;
}
