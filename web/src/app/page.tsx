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
import BottomResults from '../components/ObjectCards/BottomResults';
import ObjectDetails from '../components/ObjectPanel/ObjectDetails';
import ObjectEdit from '../components/ObjectPanel/ObjectEdit';
import BottomSheet from '../components/UI/BottomSheet';
import ObjectsTableView from '../components/ObjectsTable/ObjectsTableView';
import VisitsView from '../components/Visits/VisitsView';
import DashboardView from '../components/Dashboard/DashboardView';
import CustomFieldManager from '../components/CustomFields/CustomFieldManager';
import { useRouter } from 'next/navigation';
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

  // Auto-select the first real object when markers load if none selected
  useEffect(() => {
    if (!selectedId && markers.length > 0) {
      handleSelectObject(markers[0].source_id);
    }
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
        alert("Saqlandi");
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
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
        alert("O'chirildi");
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
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
        alert("Saqlandi");
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
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
        alert("Saqlandi");
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
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
        alert("Sinxronlandi");
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi");
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
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      {/* 1. Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSync={handleSyncWithSheets}
        syncing={syncing}
        onOpenCreate={() => setIsCreateOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden lg:flex">
          <LeftSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-100 min-w-0">
          {/* Map View: Kept mounted in DOM to prevent Leaflet container re-use crashes */}
          <div className={activeTab === 'map' ? 'flex flex-col flex-1 min-w-0' : 'hidden'}>
            {/* Top Filter Pills Bar */}
            <FilterToolbar
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              onMyLocation={handleLocateMe}
              locating={locating}
            />

            {/* Map Area */}
            <div className="p-5 pb-3 shrink-0">
              <div className="h-[400px] w-full">
                <DynamicMap
                  markers={displayList}
                  onSelect={handleSelectObject}
                  selectedId={selectedId}
                  userLat={location.lat}
                  userLng={location.lng}
                />
              </div>
            </div>

            {/* Bottom Results & Cards */}
            <div className="flex-1">
              <BottomResults
                objects={displayList}
                totalCount={markers.length}
                onSelect={handleSelectObject}
                selectedId={selectedId}
                onLocate={handleLocateMe}
              />
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

          {activeTab === 'visits' && (
            <VisitsView
              currentUser={currentUser}
              objects={displayList}
              totalCount={markers.length}
              onSelect={handleSelectObject}
              onViewOnMap={handleViewOnMap}
              onRecordVisit={handleRecordVisitForId}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              objects={displayList}
              totalCount={markers.length}
              onSync={handleSyncWithSheets}
              syncing={syncing}
              onNavigateToTab={(t) => setActiveTab(t)}
            />
          )}

          {activeTab === 'custom_fields' && (
            <CustomFieldManager />
          )}
        </main>

        {/* Right Drawer / Sidebar (Desktop) */}
        {selectedId && (
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
                  onClose={() => setSelectedId(null)}
                  onEdit={() => setIsEditing(true)}
                  onRecordVisit={handleRecordVisit}
                  onClearB2B={handleClearB2B}
                />
              )
            ) : null}
          </div>
        )}

        {/* Mobile View Bottom Sheet Drawer */}
        <div className="xl:hidden">
          <BottomSheet
            isOpen={!!selectedId}
            onClose={() => setSelectedId(null)}
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
                  onClose={() => setSelectedId(null)}
                  onEdit={() => setIsEditing(true)}
                  onRecordVisit={handleRecordVisit}
                  onClearB2B={handleClearB2B}
                />
              )
            ) : null}
          </BottomSheet>
        </div>
      </div>

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
        onTabChange={setActiveTab}
      />
    </div>
  );
}
