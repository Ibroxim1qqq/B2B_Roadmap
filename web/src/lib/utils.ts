export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return Math.round(km * 1000) + ' m';
  }
  return km.toFixed(1) + ' km';
}

export function formatPhone(phone: any): string {
  if (!phone) return '';
  const str = String(phone).trim();
  const cleaned = str.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `+998 ${cleaned.slice(0,2)} ${cleaned.slice(2,5)} ${cleaned.slice(5,7)} ${cleaned.slice(7,9)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('998')) {
    return `+${cleaned.slice(0,3)} ${cleaned.slice(3,5)} ${cleaned.slice(5,8)} ${cleaned.slice(8,10)} ${cleaned.slice(10,12)}`;
  }
  return str;
}

export function getNavigationUrl(lat: any, lng: any): string {
  const latitude = parseFloat(lat) || 39.6542;
  const longitude = parseFloat(lng) || 66.9597;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function getTelegramUrl(usernameOrPhone: any): string {
  if (!usernameOrPhone) return '#';
  const str = String(usernameOrPhone).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  const clean = str.replace('@', '').replace(/\s/g, '').replace('+', '');
  return `https://t.me/${clean}`;
}

export function getInstagramUrl(handle: any): string {
  if (!handle) return '#';
  const str = String(handle).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  const clean = str.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace('@', '').replace(/\//g, '').trim();
  return `https://instagram.com/${clean}`;
}

export function getCallUrl(phone: any): string {
  if (!phone) return '#';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');
  return digits ? `tel:+${digits.startsWith('998') ? digits : digits.length === 9 ? '998' + digits : digits}` : `tel:${str}`;
}

export function getStatusColor(statusId: number | string): string {
  const s = String(statusId);
  switch(s) {
    case '1': return 'bg-green-100 text-green-800 border-green-200'; // Jarayonda
    case '2': return 'bg-orange-100 text-orange-800 border-orange-200'; // To'xtatilgan
    case '3': return 'bg-gray-100 text-gray-800 border-gray-200'; // Boshlanmagan
    case '4': return 'bg-blue-100 text-blue-800 border-blue-200'; // Yakunlangan
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getStatusIcon(statusId: number | string): string {
  const s = String(statusId);
  switch(s) {
    case '1': return '🏗️'; // Jarayonda
    case '2': return '⏸️'; // To'xtatilgan
    case '3': return '📝'; // Boshlanmagan
    case '4': return '✅'; // Yakunlangan
    default: return '📍';
  }
}
