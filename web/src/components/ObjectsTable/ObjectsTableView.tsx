'use client';
import { useState, useMemo, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { MapObject } from '../../lib/types';
import { 
  Building, Phone, MapPin, Search, ChevronLeft, ChevronRight, 
  Map as MapIcon, Send, CheckCircle2, ArrowUpDown, Eye, ChevronDown, Check, X
} from 'lucide-react';
import { getNavigationUrl, getCallUrl } from '../../lib/utils';

interface ObjectsTableViewProps {
  objects: (MapObject & { distance?: number })[];
  totalCount: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onViewOnMap: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedDistrict: string;
  onDistrictChange: (d: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
}

export default function ObjectsTableView({
  objects,
  totalCount,
  onSelect,
  selectedId,
  onViewOnMap,
  searchQuery,
  onSearchChange,
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange
}: ObjectsTableViewProps) {
  const [dataFilter, setDataFilter] = useState<'all' | 'has_internal' | 'has_phone' | 'visited' | 'empty'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'district' | 'floors' | 'apartments' | 'visit'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const districtRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useClickOutside(districtRef, () => setDistrictOpen(false), districtOpen);
  useClickOutside(statusRef, () => setStatusOpen(false), statusOpen);
  const pageSize = 15;

  const districts = [
    'Barcha tumanlar',
    'Samarqand shahar',
    'Samarqand tumani',
    'Urgut tumani',
    'Toyloq tumani',
    'Oqdaryo tumani',
    'Jomboy tumani',
    'Ishtixon tumani',
    'Payariq tumani',
    'Kattaqo\'rg\'on tumani',
    'Bulung\'ur tumani',
    'Pastdarg\'om tumani',
    'Narpay tumani',
    'Qo\'shrabot tumani',
    'Nurobod tumani'
  ];

  const statuses = [
    'Barcha statuslar',
    'Jarayonda',
    'To\'xtatilgan',
    'Muzlatilgan',
    'Topshirilgan'
  ];

  // Filter based on data completeness
  const filtered = useMemo(() => {
    return objects.filter(obj => {
      if (dataFilter === 'has_internal') return Boolean(obj.has_internal || obj.phone || obj.tjm_name);
      if (dataFilter === 'has_phone') return Boolean(obj.phone);
      if (dataFilter === 'visited') return Boolean(obj.is_visited);
      if (dataFilter === 'empty') return !obj.has_internal && !obj.phone && !obj.tjm_name;
      return true;
    });
  }, [objects, dataFilter]);

  // Sort objects
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        const nameA = (a.tjm_name || a.object_name || '').toLowerCase();
        const nameB = (b.tjm_name || b.object_name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'district') {
        comparison = (a.district_name || '').localeCompare(b.district_name || '');
      } else if (sortBy === 'floors') {
        const flA = parseInt(a.floors || '0') || 0;
        const flB = parseInt(b.floors || '0') || 0;
        comparison = flA - flB;
      } else if (sortBy === 'apartments') {
        const apA = parseInt(a.apartment_count || '0') || 0;
        const apB = parseInt(b.apartment_count || '0') || 0;
        comparison = apA - apB;
      } else if (sortBy === 'visit') {
        const vA = a.last_visit || '';
        const vB = b.last_visit || '';
        comparison = vA.localeCompare(vB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col: 'name' | 'district' | 'floors' | 'apartments' | 'visit') => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const countWithData = objects.filter(o => o.has_internal || o.phone || o.tjm_name).length;
  const countWithPhone = objects.filter(o => o.phone).length;
  const countVisited = objects.filter(o => o.is_visited).length;
  const countEmpty = totalCount - countWithData;

  const hasActiveFilters = Boolean(searchQuery || selectedDistrict || selectedStatus || dataFilter !== 'all');

  const clearAllFilters = () => {
    onSearchChange('');
    onDistrictChange('');
    onStatusChange('');
    setDataFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-5">
      {/* Header bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <span>Obyektlar Ro'yxati</span>
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                {sorted.length} / {totalCount} ta obyekt
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Samarqand viloyati bo'yicha Shaffof Qurilish davlat reyestridagi barcha ko'p xonadonli uy-joylar va CRM ma'lumotlari
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => { setDataFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                dataFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Barchasi ({totalCount})
            </button>
            <button
              onClick={() => { setDataFilter('has_internal'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                dataFilter === 'has_internal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>B2B kiritilgan ({countWithData})</span>
            </button>
            <button
              onClick={() => { setDataFilter('has_phone'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                dataFilter === 'has_phone'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Telefonli ({countWithPhone})</span>
            </button>
            <button
              onClick={() => { setDataFilter('visited'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                dataFilter === 'visited'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tashrif qilingan ({countVisited})</span>
            </button>
            <button
              onClick={() => { setDataFilter('empty'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                dataFilter === 'empty'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Ma'lumotsiz ({countEmpty})
            </button>
          </div>
        </div>

        {/* Filter Dropdowns & In-Table Search Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Table Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Jadval bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => { onSearchChange(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* District Selector */}
            <div ref={districtRef} className="relative">
              <button
                onClick={() => { setDistrictOpen(!districtOpen); setStatusOpen(false); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700 transition-colors"
              >
                <span>{selectedDistrict || 'Barcha tumanlar'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {districtOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40 max-h-56 overflow-y-auto">
                  {districts.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        onDistrictChange(d === 'Barcha tumanlar' ? '' : d);
                        setDistrictOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
                        (selectedDistrict === d || (!selectedDistrict && d === 'Barcha tumanlar'))
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{d}</span>
                      {(selectedDistrict === d || (!selectedDistrict && d === 'Barcha tumanlar')) && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Selector */}
            <div ref={statusRef} className="relative">
              <button
                onClick={() => { setStatusOpen(!statusOpen); setDistrictOpen(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl font-semibold transition-colors ${
                  selectedStatus
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span>{selectedStatus ? `Status: ${selectedStatus}` : 'Barcha statuslar'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {statusOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onStatusChange(s === 'Barcha statuslar' ? '' : s);
                        setStatusOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
                        (selectedStatus === s || (!selectedStatus && s === 'Barcha statuslar'))
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{s}</span>
                      {(selectedStatus === s || (!selectedStatus && s === 'Barcha statuslar')) && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1 text-slate-400 hover:text-rose-600 font-semibold transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tozalash</span>
              </button>
            )}
          </div>

          <div className="text-slate-400 text-[11px]">
            Ko'rsatilmoqda: <strong className="text-slate-700">{sorted.length}</strong> ta mos obyekt
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-14 text-center"># ID</th>
                <th 
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Obyekt / TJM Nomi</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('district')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tuman</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Status</th>
                <th 
                  onClick={() => toggleSort('floors')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Qavat</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Pudratchi / Buyurtmachi</th>
                <th className="py-3 px-4">B2B Kontaktlar</th>
                <th 
                  onClick={() => toggleSort('visit')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Oxirgi Tashrif</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right pr-6">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Mos obyektlar topilmadi
                  </td>
                </tr>
              ) : (
                paginated.map((obj) => {
                  const isSelected = selectedId === obj.source_id;

                  return (
                    <tr
                      key={obj.source_id}
                      onClick={() => onSelect(obj.source_id)}
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-medium' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                        {obj.source_id}
                      </td>

                      {/* Name & Address */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={obj.tjm_name || obj.object_name}>
                          {obj.tjm_name || obj.object_name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5" title={obj.address || obj.sales_office}>
                          {obj.address || obj.sales_office || 'Samarqand'}
                        </div>
                      </td>

                      {/* District */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {obj.district_name || 'Samarqand'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {obj.status || 'Jarayonda'}
                        </span>
                      </td>

                      {/* Floors */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-medium text-slate-700">
                        {obj.floors && obj.floors !== '—' ? `${obj.floors} qavat` : '—'}
                      </td>

                      {/* Builder / Customer */}
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-600 text-[11px]">
                        <div className="font-medium text-slate-800 truncate" title={obj.builder || ''}>
                          {obj.builder || 'Pudratchi ko\'rsatilmagan'}
                        </div>
                        <div className="text-slate-400 truncate mt-0.5" title={obj.customer || ''}>
                          {obj.customer || '—'}
                        </div>
                      </td>

                      {/* B2B Contacts */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {obj.phone ? (
                          <div className="space-y-1">
                            <a
                              href={getCallUrl(obj.phone)}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-emerald-700 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{obj.phone}</span>
                            </a>
                            {obj.manager_name && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                {obj.manager_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px] italic">Kiritilmagan</span>
                        )}
                      </td>

                      {/* Last Visit */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        {obj.last_visit ? (
                          <div>
                            <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {obj.last_visit}
                            </span>
                            {obj.visited_by && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {obj.visited_by}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right pr-6 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelect(obj.source_id)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Tafsilotlar va Tahrirlash"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onViewOnMap(obj.source_id)}
                            className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Xaritada ko'rish"
                          >
                            <MapIcon className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          <a
                            href={getNavigationUrl(obj.latitude, obj.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Google Maps Navigatsiya"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Ko'rsatilmoqda: {sorted.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, sorted.length)} / jami {sorted.length} ta
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">
              Sahifa {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
