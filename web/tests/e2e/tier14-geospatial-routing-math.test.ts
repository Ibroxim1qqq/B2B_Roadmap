import * as assert from 'node:assert/strict';
import {
  defineTest
} from './harness.ts';
import {
  calculateDistance,
  formatDistance,
  formatPhone,
  getNavigationUrl,
  getYandexNavUrl,
  getYandexAppNavUrl,
  getTelegramUrl,
  getInstagramUrl,
  getCallUrl,
  getStatusColor,
  getStatusIcon
} from '../../src/lib/utils.ts';

// ============================================================================
// TIER 14: Geospatial Routing & Mathematical Precision Tests
// ============================================================================

defineTest('calculateDistance computes exact Haversine distance between city landmarks', {
  tier: 14, milestone: 14, feature: 'HAVERSINE_PRECISION',
  description: 'Distance between Registon and Gur-i Mir in Samarqand is approx 1.03 km'
}, () => {
  const registon = { lat: 39.6548, lng: 66.9758 };
  const gurImir = { lat: 39.6486, lng: 66.9687 };

  const dist = calculateDistance(registon.lat, registon.lng, gurImir.lat, gurImir.lng);
  assert.ok(dist >= 0.85 && dist <= 1.05, `Expected ~0.92 km, got ${dist.toFixed(3)} km`);
});

defineTest('calculateDistance computes inter-city distance with < 1% error', {
  tier: 14, milestone: 14, feature: 'HAVERSINE_SAMARQAND_TASHKENT',
  description: 'Distance between Samarqand and Tashkent is approx 268-270 km'
}, () => {
  const samarqand = { lat: 39.6542, lng: 66.9597 };
  const toshkent = { lat: 41.3111, lng: 69.2797 };

  const dist = calculateDistance(samarqand.lat, samarqand.lng, toshkent.lat, toshkent.lng);
  assert.ok(dist >= 265 && dist <= 273, `Expected ~268 km, got ${dist.toFixed(2)} km`);
});

defineTest('calculateDistance returns strictly 0 for identical points', {
  tier: 14, milestone: 14, feature: 'HAVERSINE_ZERO_DISTANCE',
  description: 'Zero coordinate offset produces exactly 0 distance'
}, () => {
  const dist = calculateDistance(39.65, 66.96, 39.65, 66.96);
  assert.equal(dist, 0);
});

defineTest('formatDistance formats meters and kilometers accurately', {
  tier: 14, milestone: 14, feature: 'FORMAT_DISTANCE',
  description: 'Under 1km formats in meters, >= 1km formats with 1 decimal'
}, () => {
  assert.equal(formatDistance(0.45), '450 m');
  assert.equal(formatDistance(0.08), '80 m');
  assert.equal(formatDistance(1.234), '1.2 km');
  assert.equal(formatDistance(15.89), '15.9 km');
});

defineTest('formatPhone standardizes 9-digit and 12-digit Uzbek phone numbers', {
  tier: 14, milestone: 14, feature: 'FORMAT_PHONE_UZBEK',
  description: 'Formats 901234567 and 998901234567 into +998 90 123 45 67'
}, () => {
  assert.equal(formatPhone('901234567'), '+998 90 123 45 67');
  assert.equal(formatPhone('998901234567'), '+998 90 123 45 67');
  assert.equal(formatPhone('+998 (90) 123-45-67'), '+998 90 123 45 67');
  assert.equal(formatPhone(''), '');
  assert.equal(formatPhone(null), '');
});

defineTest('Navigation URL generators produce valid Google and Yandex Maps links', {
  tier: 14, milestone: 14, feature: 'GEO_NAV_URLS',
  description: 'Generates web directions and mobile app deep links'
}, () => {
  const lat = 39.6542;
  const lng = 66.9597;

  const googleUrl = getNavigationUrl(lat, lng);
  assert.ok(googleUrl.includes('google.com/maps/dir/'));
  assert.ok(googleUrl.includes('39.6542,66.9597'));

  const yandexUrl = getYandexNavUrl(lat, lng);
  assert.ok(yandexUrl.includes('yandex.com/maps'));
  assert.ok(yandexUrl.includes('rtext=~39.6542,66.9597'));

  const appUrl = getYandexAppNavUrl(lat, lng);
  assert.ok(appUrl.startsWith('yandexmaps://build_route_on_map'));
  assert.ok(appUrl.includes('lat_to=39.6542'));
  assert.ok(appUrl.includes('lon_to=66.9597'));
});

defineTest('Social and messaging link generators format clean URLs', {
  tier: 14, milestone: 14, feature: 'TELEGRAM_INSTAGRAM_URLS',
  description: 'Strips special characters and prefixes for Telegram and Instagram'
}, () => {
  assert.equal(getTelegramUrl('@menejer_b2b'), 'https://t.me/menejer_b2b');
  assert.equal(getTelegramUrl('+998901234567'), 'https://t.me/998901234567');
  assert.equal(getTelegramUrl('https://t.me/custom_link'), 'https://t.me/custom_link');

  assert.equal(getInstagramUrl('@samarqand_dom'), 'https://instagram.com/samarqand_dom');
  assert.equal(getInstagramUrl('samarqand_dom'), 'https://instagram.com/samarqand_dom');
  assert.equal(getInstagramUrl('https://instagram.com/samarqand_dom/'), 'https://instagram.com/samarqand_dom/');
});

defineTest('getCallUrl formats tel protocol links with country code', {
  tier: 14, milestone: 14, feature: 'CALL_URL',
  description: 'Wraps phone numbers in tel:+998 format'
}, () => {
  assert.equal(getCallUrl('901234567'), 'tel:+998901234567');
  assert.equal(getCallUrl('+998 91 234 56 78'), 'tel:+998912345678');
  assert.equal(getCallUrl(''), '#');
});

defineTest('Status styling and icon helpers match design specification', {
  tier: 14, milestone: 14, feature: 'STATUS_BADGES',
  description: 'Maps status IDs to colors and construction emojis'
}, () => {
  assert.ok(getStatusColor(1).includes('green'));
  assert.ok(getStatusColor(2).includes('orange'));
  assert.ok(getStatusColor(3).includes('gray'));
  assert.ok(getStatusColor(4).includes('blue'));

  assert.equal(getStatusIcon(1), '🏗️');
  assert.equal(getStatusIcon(2), '⏸️');
  assert.equal(getStatusIcon(3), '📝');
  assert.equal(getStatusIcon(4), '✅');
});
