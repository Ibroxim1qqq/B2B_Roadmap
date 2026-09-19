'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useObjects } from '../hooks/useObjects';
import { useLocation } from '../hooks/useLocation';
import { useDistance } from '../hooks/useDistance';
import { api } from '../lib/api';
import { ObjectDetail, CustomField, MapObject, UserProfile } from '../lib/types';
import { getCurrentUser, setCurrentUser as saveCurrentUser, logout as authLogout } from '../lib/auth';
import Navbar from '../components/Header/Navbar';
import LeftSidebar from '../components/Sidebar/LeftSidebar';
import FilterToolbar from '../components/Filters/FilterToolbar';
import ObjectDetails from '../components/ObjectPanel/ObjectDetails';
import ObjectEdit from '../components/ObjectPanel/ObjectEdit';
import BottomSheet from '../components/UI/BottomSheet';
import ObjectsTableView from '../components/ObjectsTable/ObjectsTableView';
import DashboardView from '../components/Dashboard/DashboardView';
import CustomFieldManager from '../components/CustomFields/CustomFieldManager';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, CheckCircle2, Clock } from 'lucide-react';
import MobileBottomNav from '../components/Navigation/MobileBottomNav';

const CreateObjectModal = dynamic(() => import('../components/ObjectPanel/CreateObjectModal'), { 
  ssr: false 
});

const DynamicMap = dynamic(() => import('../components/Map/MapContainer'), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200">
      <div className="text-slate-500 font-semibold text-sm flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
        <span>Xarita yuklanmoqda...</span>
      </div>
    </div>
  )
});

export default function Home() {
  const { markers, loading, error, refresh } = useObjects();
  const { location, getCurrentPosition } = useLocation();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Jarayonda');
  const [locating, setLocating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Object Selection & Details
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [objectDetail, setObjectDetail] = useState<ObjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // User Authentication & Session
  const [currentUser, setLocalCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    setLocalCurrentUser(user);
    setAuthChecked(true);
    if (!user) {
      router.replace('/login');
    }
  }, [router]);

  const handleLogin = (user: UserProfile) => {
    saveCurrentUser(user);
    setLocalCurrentUser(user);
  };

  const handleLogout = () => {
    authLogout();
    setLocalCurrentUser(null);
    router.replace('/login');
  };

  // Real-time active filtering for search, district, and status
  const activeFilteredMarkers = useMemo(() => {
    return markers.filter(m => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (m.object_name || '').toLowerCase();
        const tjm = (m.tjm_name || '').toLowerCase();
        const addr = (m.address || m.sales_office || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();
        const mgr = (m.manager_name || '').toLowerCase();
        const builder = (m.builder || '').toLowerCase();
        const customer = (m.customer || '').toLowerCase();
        if (
          !name.includes(q) && 
          !tjm.includes(q) && 
          !addr.includes(q) && 
          !phone.includes(q) && 
          !mgr.includes(q) &&
          !builder.includes(q) &&
          !customer.includes(q)
        ) {
          return false;
        }
      }

      // 2. District Filter
      if (selectedDistrict && selectedDistrict !== 'Barcha tumanlar') {
        const d = selectedDistrict.toLowerCase().trim();
        const mDistrict = (m.district_name || '').toLowerCase().trim();
        if (!mDistrict.includes(d) && !d.includes(mDistrict)) {
          return false;
        }
      }

      // 3. Status Filter (e.g. Jarayonda, To'xtatilgan, Muzlatilgan, Topshirilgan)
      if (selectedStatus && selectedStatus !== 'Barcha statuslar') {
        const s = selectedStatus.toLowerCase().trim();
        const mStatus = (m.status || '').toLowerCase().trim();
        if (!mStatus.includes(s) && !s.includes(mStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [markers, searchQuery, selectedDistrict, selectedStatus]);

  // Calculate distances if user location exists
  const objectsWithDistance = useDistance(activeFilteredMarkers, location.lat, location.lng);
  const displayList = (location.lat && location.lng ? objectsWithDistance : activeFilteredMarkers) as (MapObject & { distance?: number })[];

  // Real-time calculation for the 4 top summary cards
  const stats = useMemo(() => {
    const total = markers.length;
    const visited = markers.filter(m => Boolean(m.is_visited || m.last_visit)).length;
    const filled = markers.filter(m => Boolean(m.has_internal || m.tjm_name || m.phone || m.manager_name)).length;
    const notVisited = Math.max(0, total - visited);
    return { total, visited, filled, notVisited };
  }, [markers]);

  // Load custom field settings
  useEffect(() => {
    api.getSettings().then(setCustomFields).catch(console.error);
  }, []);

  const handleSelectObject = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setIsEditing(false);
    try {
      const detail = await api.getObject(id);
      setObjectDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Switch to map tab and focus selected object
  const handleViewOnMap = (id: string) => {
    setActiveTab('map');
    handleSelectObject(id);
  };

  // Switch tab and clean up selected object panel
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedId(null);
    setIsEditing(false);
  };

  // CRUD: Update B2B data
  const handleSaveObject = async (data: Record<string, string>) => {
    if (!selectedId) return;
    try {
      const res = await api.updateObject(selectedId, data);
      if (res && res.success) {
        const detail = await api.getObject(selectedId);
        setObjectDetail(detail);
        setIsEditing(false);
        await refresh();
        alert("Muvaffaqiyatli saqlandi!");
      } else {
        alert("Xatolik: " + ((res as any)?.error || res?.message || 'Saqlash amalga oshmadi'));
      }
    } catch (err: any) {
      console.error(err);
      alert("Xatolik yuz berdi: " + (err.message || ''));
    }
  };

  // CRUD: Delete / Clear B2B data
  const handleClearB2B = async () => {
    if (!selectedId) return;
    try {
      const res = await api.clearObject(selectedId);
      if (res && res.success) {
        const detail = await api.getObject(selectedId);
        setObjectDetail(detail);
        setIsEditing(false);
        await refresh();
        alert("B2B ma'lumotlari muvaffaqiyatli tozalandi!");
      } else {
        alert("Xatolik: " + ((res as any)?.error || res?.message || 'Tozalash amalga oshmadi'));
      }
    } catch (err: any) {
      console.error(err);
      alert("Xatolik yuz berdi: " + (err.message || ''));
    }
  };

  // CRUD: Record Visit by ID
  const handleRecordVisitForId = async (id: string) => {
    if (!id) return;
    try {
      const res = await api.recordVisit({
        source_id: String(id),
        visited_by: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Menejer (Field Sales)',
        lat_lng: location.lat && location.lng ? `${location.lat},${location.lng}` : undefined
      });
      if (res && res.success) {
        await refresh();
        if (selectedId === id) {
          const detail = await api.getObject(id);
          setObjectDetail(detail);
        }
        alert("Tashrif muvaffaqiyatli saqlandi!");
      } else {
        alert("Xatolik: " + ((res as any)?.error || res?.message || 'Tashrif qayd etilmadi'));
      }
    } catch (err: any) {
      console.error(err);
      alert("Xatolik yuz berdi: " + (err.message || ''));
    }
  };

  const handleRecordVisit = async () => {
    if (!selectedId) return;
    await handleRecordVisitForId(selectedId);
  };

  // CRUD: Create new building object
  const handleCreateObject = async (newData: Record<string, any>) => {
    try {
      const res = await api.createObject(newData);
      if (res && res.success) {
        await refresh();
        const newId = res.data?.source_id;
        if (newId) {
          handleSelectObject(newId);
          setActiveTab('map');
        }
        alert("Yangi bino muvaffaqiyatli qo'shildi!");
      } else {
        alert("Xatolik: " + ((res as any)?.error || res?.message || 'Bino yaratilmadi'));
      }
    } catch (err: any) {
      console.error(err);
      alert("Xatolik yuz berdi: " + (err.message || ''));
    }
  };

  // Live Sync with Google Sheets
  const handleSyncWithSheets = async () => {
    setSyncing(true);
    try {
      const res = await api.syncWithSheets();
      if (res && res.success) {
        await refresh();
        if (selectedId) {
          const detail = await api.getObject(selectedId);
          setObjectDetail(detail);
        }
        alert(`Google Sheets bilan sinxronlandi! Jami: ${res.count || 0} ta obyekt`);
      } else {
        alert("Sinxronizatsiya xatosi: " + ((res as any)?.error || 'Baza bilan ulanib bo\'lmadi'));
      }
    } catch (e: any) {
      console.error(e);
      alert("Xatolik yuz berdi: " + (e.message || ''));
    } finally {
      setSyncing(false);
    }
  };

  const handleLocateMe = () => {
    setLocating(true);
    getCurrentPosition();
    setTimeout(() => setLocating(false), 1200);
  };

  const selectedDistance = useMemo(() => {
    if (!selectedId) return undefined;
    const found = displayList.find(m => m.source_id === selectedId);
    return found?.distance;
  }, [selectedId, displayList]);

  if (error) {
    return (
      <div className="p-8 text-rose-600 text-center">
        Xatolik yuz berdi: {error.message}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      {/* 1. Left Sidebar (Full 100vh Height, Auto-expand on Hover) */}
      <div className="hidden lg:flex h-full shrink-0">
        <LeftSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* 2. Main Right Workspace (Header + Canvas) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar (Shows current section title, actions, and user profile) */}
        <Navbar
          activeTab={activeTab}
          onSync={handleSyncWithSheets}
          syncing={syncing}
          onOpenCreate={() => setIsCreateOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Workspace Body (Center Canvas + Right Panel) */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          <main className="flex-1 flex flex-col overflow-y-auto bg-slate-100 min-w-0">
            {/* Map View: Kept mounted in DOM to prevent Leaflet container re-use crashes */}
            <div className={activeTab === 'map' ? 'flex flex-col flex-1 h-full min-w-0 overflow-hidden' : 'hidden'}>
            {/* 1. 4 Summary Stat Cards at the Top */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 pt-4 pb-2 shrink-0">
              {/* Card 1: Jami TJM-lar */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500 truncate">Jami TJM-lar</p>
                  <p className="text-lg font-black text-slate-900 leading-tight">
                    {stats.total} <span className="text-xs font-normal text-slate-400">ta</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Tashrif qilingan */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500 truncate">Tashrif qilingan</p>
                  <p className="text-lg font-black text-emerald-600 leading-tight">
                    {stats.visited} <span className="text-xs font-normal text-slate-400">ta</span>
                  </p>
                </div>
              </div>

              {/* Card 3: Ma'lumot to'ldirilgan */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500 truncate">Ma'lumot to'ldirilgan</p>
                  <p className="text-lg font-black text-indigo-600 leading-tight">
                    {stats.filled} <span className="text-xs font-normal text-slate-400">ta</span>
                  </p>
                </div>
              </div>

              {/* Card 4: Tashrif qilinmagan */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500 truncate">Tashrif qilinmagan</p>
                  <p className="text-lg font-black text-amber-600 leading-tight">
                    {stats.notVisited} <span className="text-xs font-normal text-slate-400">ta</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Filter Pills Bar (Directly Above the Map) */}
            <FilterToolbar
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              onMyLocation={handleLocateMe}
              locating={locating}
            />

            {/* 3. Fullscreen Map Area */}
            <div className="flex-1 p-5 pt-2 pb-4 min-h-0">
              <div className="h-full w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white">
                <DynamicMap
                  markers={displayList}
                  onSelect={handleSelectObject}
                  selectedId={selectedId}
                  userLat={location.lat}
                  userLng={location.lng}
                />
              </div>
            </div>
          </div>

          {activeTab === 'objects' && (
            <ObjectsTableView
              objects={displayList}
              totalCount={markers.length}
              onSelect={handleSelectObject}
              selectedId={selectedId}
              onViewOnMap={handleViewOnMap}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              objects={displayList}
              totalCount={markers.length}
              onSync={handleSyncWithSheets}
              syncing={syncing}
              onNavigateToTab={(t) => handleTabChange(t)}
            />
          )}

          {activeTab === 'custom_fields' && (
            <CustomFieldManager />
          )}
        </main>

        {/* Right Drawer / Sidebar (ONLY FOR MAP TAB) */}
        {selectedId && activeTab === 'map' && (
          <div className="hidden xl:flex w-[410px] shrink-0 h-full">
            {detailLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-white border-l border-slate-200">
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                  <span>Yuklanmoqda...</span>
                </div>
              </div>
            ) : objectDetail ? (
              isEditing ? (
                <ObjectEdit
                  sourceId={selectedId}
                  initialData={objectDetail.internal}
                  fields={customFields}
                  onSave={handleSaveObject}
                  onCancel={() => setIsEditing(false)}
                  onClear={handleClearB2B}
                />
              ) : (
                <ObjectDetails
                  detail={objectDetail}
                  distance={selectedDistance}
                  onClose={() => { setSelectedId(null); setIsEditing(false); }}
                  onEdit={() => setIsEditing(true)}
                  onRecordVisit={handleRecordVisit}
                  onClearB2B={handleClearB2B}
                />
              )
            ) : null}
          </div>
        )}

        {/* Mobile View Bottom Sheet Drawer (For Map tab on mobile) */}
        {activeTab === 'map' && (
          <div className="xl:hidden">
            <BottomSheet
              isOpen={!!selectedId}
              onClose={() => { setSelectedId(null); setIsEditing(false); }}
            >
              {detailLoading ? (
                <div className="p-8 text-center text-slate-500 text-xs">Yuklanmoqda...</div>
              ) : objectDetail ? (
                isEditing ? (
                  <ObjectEdit
                    sourceId={selectedId as string}
                    initialData={objectDetail.internal}
                    fields={customFields}
                    onSave={handleSaveObject}
                    onCancel={() => setIsEditing(false)}
                    onClear={handleClearB2B}
                  />
                ) : (
                  <ObjectDetails
                    detail={objectDetail}
                    distance={selectedDistance}
                    onClose={() => { setSelectedId(null); setIsEditing(false); }}
                    onEdit={() => setIsEditing(true)}
                    onRecordVisit={handleRecordVisit}
                    onClearB2B={handleClearB2B}
                  />
                )
              ) : null}
            </BottomSheet>
          </div>
        )}
        </div>
      </div>

      {/* Center Modal for Object Details (When on Objects, Visits, or Dashboard tabs) */}
      {selectedId && activeTab !== 'map' && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedId(null);
              setIsEditing(false);
            }
          }}
        >
          <div className="bg-white w-full max-w-xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150">
            {detailLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 h-full">
                <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                <p className="text-xs text-slate-400 font-semibold">Yuklanmoqda...</p>
              </div>
            ) : objectDetail ? (
              isEditing ? (
                <ObjectEdit
                  sourceId={selectedId}
                  initialData={objectDetail.internal}
                  fields={customFields}
                  onSave={handleSaveObject}
                  onCancel={() => setIsEditing(false)}
                  onClear={handleClearB2B}
                />
              ) : (
                <ObjectDetails
                  detail={objectDetail}
                  distance={selectedDistance}
                  onClose={() => { setSelectedId(null); setIsEditing(false); }}
                  onEdit={() => setIsEditing(true)}
                  onRecordVisit={handleRecordVisit}
                  onClearB2B={handleClearB2B}
                />
              )
            ) : null}
          </div>
        </div>
      )}

      {/* Create New Object Modal */}
      <CreateObjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreateObject}
        userLat={location.lat}
        userLng={location.lng}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
