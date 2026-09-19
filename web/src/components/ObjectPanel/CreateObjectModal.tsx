'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  X, MapPin, Building, Phone, User, Calendar, 
  Compass, Layers, ShieldCheck, Check, AlertCircle, 
  FileText, ExternalLink, Navigation, Plus
} from 'lucide-react';
import type L from 'leaflet';

const DISTRICT_OPTIONS = [
  { id: '1718401', name: 'Samarqand shahar' },
  { id: '1718235', name: 'Samarqand tumani' },
  { id: '1718238', name: 'Urgut tumani' },
  { id: '1718236', name: 'Toyloq tumani' },
  { id: '1718203', name: 'Oqdaryo tumani' },
  { id: '1718209', name: 'Jomboy tumani' },
  { id: '1718212', name: 'Ishtixon tumani' },
  { id: '1718233', name: 'Payariq tumani' },
  { id: '1718215', name: "Kattaqo'rg'on tumani" },
  { id: '1718406', name: "Kattaqo'rg'on shahar" },
  { id: '1718206', name: "Bulung'ur tumani" },
  { id: '1718227', name: "Pastdarg'om tumani" },
  { id: '1718218', name: 'Narpay tumani' },
  { id: '1718216', name: "Qo'shrabot tumani" },
  { id: '1718230', name: 'Paxtachi tumani' },
  { id: '1718224', name: 'Nurobod tumani' }
];

interface CreateObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newObjectData: Record<string, any>) => Promise<void>;
  userLat?: number | null;
  userLng?: number | null;
}

export default function CreateObjectModal({
  isOpen,
  onClose,
  onSave,
  userLat,
  userLng
}: CreateObjectModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'crm'>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [tjmName, setTjmName] = useState('');
  const [districtSoato, setDistrictSoato] = useState('1718401');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>(userLat || 39.6542);
  const [lng, setLng] = useState<number>(userLng || 66.9597);
  const [status, setStatus] = useState('Qurilish jarayonida');
  const [floors, setFloors] = useState('');
  const [apartments, setApartments] = useState('');
  const [blocks, setBlocks] = useState('1');
  const [builder, setBuilder] = useState('');
  const [customer, setCustomer] = useState('');
  const [deadline, setDeadline] = useState('');

  // CRM states
  const [phone, setPhone] = useState('');
  const [salesOffice, setSalesOffice] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [instagram, setInstagram] = useState('');
  const [priority, setPriority] = useState<string>("O'rta");
  const [notes, setNotes] = useState('');

  // Mini map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Initialize and handle Leaflet map
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
      }

      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;
      await import('leaflet/dist/leaflet.css');

      const initialLat = lat || 39.6542;
      const initialLng = lng || 66.9597;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(map);

      // Custom marker icon
      const pinIcon = L.divIcon({
        className: 'custom-picker-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white ring-4 ring-blue-500/30">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div class="absolute -bottom-1 w-2.5 h-2.5 bg-blue-600 rotate-45"></div>
          </div>
        `,
        iconSize: [36, 40],
        iconAnchor: [18, 40]
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: pinIcon
      }).addTo(map);

      markerInstanceRef.current = marker;
      mapInstanceRef.current = map;

      const updateCoordinates = (newLat: number, newLng: number) => {
        setLat(Number(newLat.toFixed(6)));
        setLng(Number(newLng.toFixed(6)));

        // Optional reverse geocoding to suggest address if empty
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              setAddress(prev => prev.trim() ? prev : data.display_name.split(',').slice(0, 3).join(', '));
            }
          })
          .catch(() => {});
      };

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        updateCoordinates(e.latlng.lat, e.latlng.lng);
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateCoordinates(pos.lat, pos.lng);
      });

      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up Leaflet on unmount or close
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }
  }, [isOpen]);

  const handleCenterOnUser = () => {
    if (userLat && userLng && mapInstanceRef.current && markerInstanceRef.current) {
      setLat(Number(userLat.toFixed(6)));
      setLng(Number(userLng.toFixed(6)));
      mapInstanceRef.current.setView([userLat, userLng], 15);
      markerInstanceRef.current.setLatLng([userLat, userLng]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tjmName.trim()) {
      setError("Iltimos, TJM yoki obyekt nomini kiriting!");
      setActiveTab('basic');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await onSave({
        tjm_name: tjmName.trim(),
        object_name: tjmName.trim(),
        district_soato: districtSoato,
        address: address.trim() || 'Samarqand',
        latitude: lat,
        longitude: lng,
        status: status,
        floors: floors.trim(),
        apartment_count: apartments.trim(),
        block_count: blocks.trim() || '1',
        builder: builder.trim(),
        customer: customer.trim(),
        deadline: deadline.trim(),
        phone: phone.trim(),
        sales_office: salesOffice.trim(),
        manager_name: managerName.trim(),
        manager_phone: managerPhone.trim(),
        telegram: telegram.trim(),
        instagram: instagram.trim(),
        priority: priority,
        notes: notes.trim()
      });

      // Reset form
      setTjmName('');
      setAddress('');
      setFloors('');
      setApartments('');
      setBuilder('');
      setCustomer('');
      setPhone('');
      setSalesOffice('');
      setManagerName('');
      setManagerPhone('');
      setTelegram('');
      setInstagram('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200"
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                Yangi Obyekt (TJM) Qo'shish
              </h2>
              <p className="text-xs text-slate-500">
                Xaritadan manzilni belgilang va majmua ma'lumotlarini kiriting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center border-b border-slate-200 bg-white px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>1. Asosiy & Xarita</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'crm'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>2. B2B CRM & Aloqa</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'basic' && (
            <>
              {/* Map Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xaritadan joylashuvni belgilang</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {userLat && userLng && (
                    <button
                      type="button"
                      onClick={handleCenterOnUser}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Mening joylashuvim</span>
                    </button>
                  )}
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100 h-48 sm:h-56 select-none">
                  <div ref={mapContainerRef} className="w-full h-full" />
                  <div className="absolute bottom-2 left-2 z-20 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-mono shadow-xs">
                    Lat: {lat} | Lng: {lng}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Xaritadagi ixtiyoriy joyga bosib yoki belgini surib manzil nuqtasini tanlang
                </p>
              </div>

              {/* Basic Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* TJM Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    TJM / Obyekt Nomi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Registon Plaza, Afrosiyob City..."
                    value={tjmName}
                    onChange={(e) => setTjmName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl px-3 py-2.5 outline-none transition-all"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tuman
                  </label>
                  <select
                    value={districtSoato}
                    onChange={(e) => setDistrictSoato(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  >
                    {DISTRICT_OPTIONS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Qurilish Statusi
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="Qurilish jarayonida">Qurilish jarayonida</option>
                    <option value="Foydalanishga topshirilgan">Foydalanishga topshirilgan</option>
                    <option value="To'xtatilgan">To'xtatilgan</option>
                    <option value="Muzlatilgan">Muzlatilgan</option>
                  </select>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aniq Manzil
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: Beruniy ko'chasi, 24-uy"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>

                {/* Floors */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Qavatlar Soni
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: 9 yoki 12"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>

                {/* Apartment Count */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Xonadonlar Soni
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: 72"
                    value={apartments}
                    onChange={(e) => setApartments(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>

                {/* Builder */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pudratchi / Quruvchi
                  </label>
                  <input
                    type="text"
                    placeholder="Quruvchi korxona nomi"
                    value={builder}
                    onChange={(e) => setBuilder(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>

                {/* Customer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Buyurtmachi
                  </label>
                  <input
                    type="text"
                    placeholder="Buyurtmachi kompaniya"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Topshirish Muddati
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: 2026-yil IV-chorak"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>

                {/* Block count */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bloklar Soni
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: 2"
                    value={blocks}
                    onChange={(e) => setBlocks(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'crm' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Obyekt Telefoni
                </label>
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ustuvorlik (Priority)
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                >
                  <option value="Yuqori">🔴 Yuqori</option>
                  <option value="O'rta">🟡 O'rta</option>
                  <option value="Past">🟢 Past</option>
                </select>
              </div>

              {/* Sales office */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sotuv Ofisi Manzili
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Obyekt hududida 1-qavatda"
                  value={salesOffice}
                  onChange={(e) => setSalesOffice(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                />
              </div>

              {/* Manager name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Menejer / Mas'ul Shaxs
                </label>
                <input
                  type="text"
                  placeholder="Ism Familiya"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                />
              </div>

              {/* Manager phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Menejer Telefoni
                </label>
                <input
                  type="text"
                  placeholder="+998 99 876 54 32"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                />
              </div>

              {/* Telegram */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telegram
                </label>
                <input
                  type="text"
                  placeholder="@kanal_yoki_profil"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  placeholder="https://instagram.com/..."
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Izoh / Eslatma
                </label>
                <textarea
                  rows={3}
                  placeholder="Muzokaralar, narxlar yoki boshqa foydali ma'lumotlar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-3 outline-none resize-none"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeTab === 'basic' ? (
              <button
                type="button"
                onClick={() => setActiveTab('crm')}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Keyingisi: CRM ma'lumotlari &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className="text-slate-600 hover:text-slate-800 font-semibold"
              >
                &larr; Asosiy ma'lumotlar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saqlash</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
