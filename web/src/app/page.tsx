'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useObjects } from '../hooks/useObjects';
import { useLocation } from '../hooks/useLocation';
import { useDistance } from '../hooks/useDistance';
import { api, formatBuildingItemToObjectDetail, formatBuildingItemToMapObject } from '../lib/api';
import { ObjectDetail, CustomField, MapObject, UserProfile, WeeklySyncNotification, NewBuildingItem } from '../lib/types';
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
import { Building2, MapPin, CheckCircle2, Clock, Bell } from 'lucide-react';
import MobileBottomNav from '../components/Navigation/MobileBottomNav';

const CreateObjectModal = dynamic(() => import('../components/ObjectPanel/CreateObjectModal'), { 
  ssr: false 
});

const NotificationDrawer = dynamic(() => import('../components/Notifications/NotificationDrawer'), { 
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

const RoutePlannerView = dynamic(() => import('../components/RoutePlanner/RoutePlannerView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Navigator yuklanmoqda...</span>
      </div>
    </div>
  )
});

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCompanyId = searchParams.get('company_id');

  // User Authentication & Session
  const [currentUser, setLocalCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
    } else {
      setLocalCurrentUser(user);
      setAuthChecked(true);
    }
  }, [router]);

  // Determine effective company ID (SuperAdmin can view as another company via ?company_id=...)
  const effectiveCompanyId = (currentUser?.role === 'superadmin' && queryCompanyId) 
    ? queryCompanyId 
    : currentUser?.company_id;

  const { markers, loading, error, refresh } = useObjects(effectiveCompanyId);
  const { location, getCurrentPosition } = useLocation();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
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
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number; timestamp: number } | null>(null);

  // Notifications State (Weekly Sync)
  const [notifications, setNotifications] = useState<WeeklySyncNotification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.getNotifications();
        if (res.success && Array.isArray(res.data)) {
          setNotifications(res.data);
          const userId = currentUser?.id || currentUser?.user_id || 'guest';
          const readKey = `b2b_read_notifs_${userId}`;
          const readIds: string[] = JSON.parse(localStorage.getItem(readKey) || '[]');
          const unread = res.data.filter(n => !readIds.includes(n.id));
          const totalNew = unread.reduce((acc, curr) => acc + (curr.new_count || (curr.new_objects?.length || 1)), 0);
          setUnreadNotifCount(totalNew);
        }
      } catch (err) {
        console.warn('Notifications load error:', err);
      }
    }
    loadNotifications();
  }, [currentUser]);

  const handleMarkAllAsRead = () => {
    const userId = currentUser?.id || currentUser?.user_id || 'guest';
    const allIds = notifications.map(n => n.id);
    localStorage.setItem(`b2b_read_notifs_${userId}`, JSON.stringify(allIds));
    setUnreadNotifCount(0);
  };

  // Combine base markers with any new objects discovered via notifications
  const allMarkers = useMemo(() => {
    const map = new Map<string, MapObject>();
    for (const m of markers) {
      map.set(String(m.source_id), m);
    }
    for (const notif of notifications) {
      for (const b of notif.new_objects || []) {
        const id = String(b.source_id);
        if (!map.has(id)) {
          map.set(id, formatBuildingItemToMapObject(b));
        }
      }
    }
    return Array.from(map.values());
  }, [markers, notifications]);

  const handleSelectNewBuilding = async (building: NewBuildingItem) => {
    setActiveTab('map');
    if (building.region_soato) {
      setSelectedRegion(building.region_soato);
    } else {
      setSelectedRegion('');
    }
    setSelectedDistrict('');
    setSelectedStatus('Barcha statuslar');
    setSearchQuery('');

    const id = String(building.source_id);
    setSelectedId(id);
    setIsEditing(false);

    // Provide instant details so the side drawer / BottomSheet renders immediately
    const immediateDetail = formatBuildingItemToObjectDetail(building);
    setObjectDetail(immediateDetail);

    // Trigger high-priority map fly-to to exact coordinates
    if (building.latitude && building.longitude) {
      setFocusTarget({
        lat: building.latitude,
        lng: building.longitude,
        zoom: 16,
        timestamp: Date.now()
      });
    }

    // Load any saved CRM data from server in background
    setDetailLoading(true);
    try {
      const serverDetail = await api.getObject(id, effectiveCompanyId);
      if (serverDetail && serverDetail.source && String(serverDetail.source.source_id) === id) {
        setObjectDetail(serverDetail);
      }
    } catch (err) {
      console.warn('Background getObject for new building:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogin = (user: UserProfile) => {
    saveCurrentUser(user);
    setLocalCurrentUser(user);
  };

  const handleLogout = () => {
    authLogout();
    setLocalCurrentUser(null);
    router.replace('/login');
  };


  // Real-time active filtering for region, search, district, and status
  const activeFilteredMarkers = useMemo(() => {
    return allMarkers.filter(m => {
      // 0. Region Filter
      if (selectedRegion && m.region_soato !== selectedRegion) {
        return false;
      }

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
  }, [allMarkers, selectedRegion, searchQuery, selectedDistrict, selectedStatus]);

  // Calculate distances if user location exists
  const objectsWithDistance = useDistance(activeFilteredMarkers, location.lat, location.lng);
  const displayList = (location.lat && location.lng ? objectsWithDistance : activeFilteredMarkers) as (MapObject & { distance?: number })[];

  // Real-time calculation for the 4 top summary cards (reflects selected region or nationwide)
  const stats = useMemo(() => {
    const targetPool = selectedRegion 
      ? allMarkers.filter(m => m.region_soato === selectedRegion)
      : allMarkers;
    const total = targetPool.length;
    const visited = targetPool.filter(m => Boolean(m.is_visited || m.last_visit)).length;
    const filled = targetPool.filter(m => Boolean(m.has_internal || m.tjm_name || m.phone || m.manager_name)).length;
    const notVisited = Math.max(0, total - visited);
    return { total, visited, filled, notVisited };
  }, [allMarkers, selectedRegion]);

  // Load custom field settings
  useEffect(() => {
    api.getSettings().then(setCustomFields).catch(console.error);
  }, []);

  const handleSelectObject = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setIsEditing(false);
    try {
      const detail = await api.getObject(id, effectiveCompanyId);
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
      const userName = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Menejer';
      const res = await api.updateObject(selectedId, data, userName, effectiveCompanyId, currentUser?.user_id);
      if (res && res.success) {
        const detail = await api.getObject(selectedId, effectiveCompanyId);
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
      const userName = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Menejer';
      const res = await api.clearObject(selectedId, userName, effectiveCompanyId, currentUser?.user_id);
      if (res && res.success) {
        const detail = await api.getObject(selectedId, effectiveCompanyId);
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
        lat_lng: location.lat && location.lng ? `${location.lat},${location.lng}` : undefined,
        company_id: effectiveCompanyId,
        user_id: currentUser?.user_id
      });
      if (res && res.success) {
        await refresh();
        if (selectedId === id) {
          const detail = await api.getObject(id, effectiveCompanyId);
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
      const userName = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Menejer';
      const res = await api.createObject(newData, userName, effectiveCompanyId, currentUser?.user_id);
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
          const detail = await api.getObject(selectedId, effectiveCompanyId);
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

  if (!authChecked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm font-medium">B2B MAP yuklanmoqda...</p>
        </div>

      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

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
          onOpenNotifications={() => {
            setIsNotificationOpen(true);
            handleMarkAllAsRead();
          }}
          unreadNotificationCount={unreadNotifCount}
        />

        {/* Workspace Body (Center Canvas + Right Panel) */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          <main className="flex-1 flex flex-col overflow-y-auto bg-slate-100 min-w-0 pb-16 lg:pb-0">
            {/* Map View: Kept mounted in DOM to prevent Leaflet container re-use crashes */}
            <div className={activeTab === 'map' ? 'flex flex-col flex-1 h-full min-w-0 overflow-hidden' : 'hidden'}>
            {/* SuperAdmin View Indicator */}
            {queryCompanyId && currentUser?.role === 'superadmin' && (
              <div className="mx-5 mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span>🛡️ SuperAdmin: Siz hozirda <strong>[{queryCompanyId}]</strong> kompaniyasi ma'lumotlarini ko'rmoqdasiz</span>
                </div>
                <button
                  onClick={() => router.push('/')}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[11px] font-bold transition-all cursor-pointer"
                >
                  Standart holatga qaytish
                </button>
              </div>
            )}

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
              selectedRegion={selectedRegion}
              onRegionChange={(reg) => {
                setSelectedRegion(reg);
                setSelectedDistrict('');
              }}
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
                  selectedRegion={selectedRegion}
                  focusTarget={focusTarget}
                />
              </div>
            </div>
          </div>

          {activeTab === 'route' && (
            <RoutePlannerView
              objects={allMarkers}
              userLat={location.lat}
              userLng={location.lng}
              onSelectObject={handleSelectObject}
              selectedId={selectedId}
              onRecordVisit={handleRecordVisitForId}
              currentUser={currentUser}
              companyId={effectiveCompanyId}
            />
          )}

          {activeTab === 'objects' && (
            <ObjectsTableView
              objects={displayList}
              totalCount={markers.length}
              onSelect={handleSelectObject}
              selectedId={selectedId}
              onViewOnMap={handleViewOnMap}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedRegion={selectedRegion}
              onRegionChange={(reg) => {
                setSelectedRegion(reg);
                setSelectedDistrict('');
              }}
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
            {detailLoading && !objectDetail ? (
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
              {detailLoading && !objectDetail ? (
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
            {detailLoading && !objectDetail ? (
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



      {/* Weekly Sync Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onSelectBuilding={handleSelectNewBuilding}
        onMarkAllAsRead={handleMarkAllAsRead}
        unreadCount={unreadNotifCount}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-slate-400 text-sm font-medium">B2B MAP yuklanmoqda...</p>
          </div>

        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

