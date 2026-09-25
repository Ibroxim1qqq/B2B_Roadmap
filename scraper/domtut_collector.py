"""
Domtut.uz Tashkent & Tashkent Region TJM Data Collector
Dedicated collector for UYSOT.UZ company data.
Scrapes residential complexes (TJM) from https://domtut.uz/catalog-nedvijimosty
"""

import sys
import os
import re
import time
import json
import logging
import argparse
import urllib.request
import urllib.parse
from html import unescape

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger('domtut_collector')

DOMTUT_BASE = 'https://domtut.uz'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,uz;q=0.8,en;q=0.7'
}

UYSOT_HEADERS = [
    'source_id',
    'object_name',
    'region',
    'region_soato',
    'district',
    'address',
    'latitude',
    'longitude',
    'developer',
    'floors',
    'apartment_count',
    'block_count',
    'price_from',
    'deadline',
    'phone',
    'sales_office',
    'manager_name',
    'manager_phone',
    'telegram',
    'email',
    'notes',
    'priority',
    'last_visit',
    'source_url',
    'image_url',
    'updated_at'
]

# District fallback coordinates for Tashkent city and region
DISTRICT_COORDS = {
    'yunusobod': (41.3644, 69.2882),
    'chilonzor': (41.2721, 69.2045),
    'mirobod': (41.2858, 69.2891),
    'yakkasaroy': (41.2783, 69.2483),
    'yashnobod': (41.2941, 69.3408),
    'bektemir': (41.2114, 69.3361),
    'mirzo-ulugbek': (41.3392, 69.3344),
    'shayxontohur': (41.3214, 69.2312),
    'olmazor': (41.3508, 69.2194),
    'sergeli': (41.2225, 69.2217),
    'yangihayot': (41.1983, 69.2056),
    'uchtepa': (41.2917, 69.1764),
    'qibray': (41.3892, 69.4583),
    'zangiota': (41.2292, 69.1389),
    'chirchiq': (41.4689, 69.5822),
    'yangiyul': (41.1167, 69.0500),
    'parkent': (41.2944, 69.6764),
    'bostonliq': (41.6000, 69.9500),
    'nurafshon': (41.0417, 69.3556),
    'olmaliq': (40.8464, 69.5986),
    'angren': (41.0167, 70.1436),
    'bekobod': (40.2167, 69.2500)
}

def fetch_url(url, retries=3, delay=1.0):
    """Fetch HTML content with exponential backoff retry"""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as res:
                return res.read().decode('utf-8', errors='ignore')
        except Exception as e:
            if attempt == retries - 1:
                logger.warning(f"Failed to fetch {url}: {e}")
                return None
            time.sleep(delay * (attempt + 1))
    return None

def clean_phone(phone_raw):
    """Clean and normalize phone string to +998... format"""
    if not phone_raw:
        return ''
    digits = re.sub(r'\D', '', str(phone_raw))
    if digits.startswith('998') and len(digits) >= 12:
        return f"+{digits[:12]}"
    elif len(digits) == 9:
        return f"+998{digits}"
    elif digits:
        return f"+{digits}"
    return phone_raw.strip()

def extract_cards_from_html(html, region_name):
    """Extract property summary items from catalog page HTML"""
    cards = []
    # Match <article ... class="...property-card..." ... data-slug="...">
    article_pattern = re.compile(
        r'<article[^>]+class=[\'"][^\'"]*property-card[^\'"]*[\'"][^>]*data-slug=[\'"]([^\'"]+)[\'"][^>]*>(.*?)</article>',
        re.DOTALL | re.IGNORECASE
    )
    
    matches = article_pattern.findall(html)
    for slug, block in matches:
        soato = '1727' if 'viloyat' in region_name.lower() else '1726'
        item = {
            'source_id': f"domtut_{slug}",
            'slug': slug,
            'region': region_name,
            'region_soato': soato,
            'source_url': f"{DOMTUT_BASE}/nedvizhimost/{slug}"
        }
        
        # 1. Object name (Complex Title)
        name_match = re.search(r'<div\s+class=[\'"]h3[\'"]>([^<]+)</div>', block)
        if not name_match:
            name_match = re.search(r'<a[^>]+title=[\'"]([^\'"]+)[\'"]', block)
        if not name_match:
            name_match = re.search(r'<meta\s+itemprop=[\'"]name[\'"]\s+content=[\'"]([^\'"]+)[\'"]', block)
        item['object_name'] = unescape(name_match.group(1).strip()) if name_match else slug.replace('-', ' ').title()
        
        # 2. Detail link
        url_match = re.search(r'<link\s+itemprop=[\'"]url[\'"]\s+href=[\'"]([^\'"]+)[\'"]', block)
        if url_match:
            rel_url = url_match.group(1).strip()
            item['source_url'] = f"{DOMTUT_BASE}{rel_url}" if rel_url.startswith('/') else rel_url
            
        # 3. Class (Komfort, Biznes, Premium)
        class_match = re.search(r'<a[^>]+class=[\'"][^\'"]*label[^\'"]*[\'"][^>]*>([^<]+)</a>', block)
        item['class_building'] = unescape(class_match.group(1).strip()) if class_match else 'Komfort'
        
        # 4. Status / Deadline
        deadline_match = re.search(r'<div\s+class=[\'"]labels-row[\'"]>\s*<span>([^<]+)</span>', block)
        item['deadline'] = unescape(deadline_match.group(1).strip()) if deadline_match else 'Qurilmoqda'
        
        # 5. Address
        addr_match = re.search(r'<address>([^<]+)</address>', block)
        if addr_match:
            full_addr = unescape(addr_match.group(1).strip())
            item['address'] = full_addr
            parts = [p.strip() for p in full_addr.split(',')]
            item['district'] = parts[0] if parts else 'Toshkent'
        else:
            item['address'] = region_name
            item['district'] = region_name
            
        # 6. Price from
        price_match = re.search(r'class=[\'"]pricing[\'"][^>]*>.*?<span[^>]+uzs=[\'"]([0-9]+)[\'"]', block, re.DOTALL)
        if price_match:
            uzs_num = int(price_match.group(1))
            item['price_from'] = f"{uzs_num // 1000000} mln so'm"
        else:
            item['price_from'] = 'Narx kelishiladi'
            
        # 7. Image
        img_match = re.search(r'data-lazy-src=[\'"]([^\'"]+)[\'"]', block)
        if not img_match:
            img_match = re.search(r'content=[\'"]([^\'"]+\.(?:webp|jpg|png|jpeg)[^\'"]*)[\'"]', block)
        if img_match:
            img_rel = img_match.group(1).split('?')[0]
            item['image_url'] = f"{DOMTUT_BASE}{img_rel}" if img_rel.startswith('/') else img_rel
        else:
            item['image_url'] = ''
            
        # 8. Telephone (card preview)
        tel_match = re.search(r'itemprop=[\'"]telephone[\'"][^>]+content=[\'"]([0-9]+)[\'"]', block)
        item['phone'] = clean_phone(tel_match.group(1)) if tel_match else ''
        
        cards.append(item)
        
    return cards

def enrich_from_detail_page(item):
    """Fetch detail page to get exact GPS coordinates, developer name, and contacts"""
    url = item.get('source_url')
    if not url:
        return item
        
    html = fetch_url(url)
    if not html:
        # Fallback coordinates based on district
        fallback_coords = get_district_fallback_coords(item.get('district', ''))
        item['latitude'] = fallback_coords[0]
        item['longitude'] = fallback_coords[1]
        return item
        
    # 1. Exact Coordinates
    # Pattern A: $linkMap('41.383118,69.288990'
    coord_match = re.search(r"\$linkMap\(\s*['\"]([0-9.]+),\s*([0-9.]+)['\"]", html)
    if not coord_match:
        # Pattern B: ([0-9]{2}\.[0-9]{4,}),\s*([0-9]{2}\.[0-9]{4,})
        coord_match = re.search(r"['\"]([4][01]\.[0-9]{4,})[\s,]+([6][90]\.[0-9]{4,})['\"]", html)
        
    if coord_match:
        try:
            item['latitude'] = float(coord_match.group(1))
            item['longitude'] = float(coord_match.group(2))
        except (ValueError, TypeError):
            fallback = get_district_fallback_coords(item.get('district', ''))
            item['latitude'], item['longitude'] = fallback
    else:
        fallback = get_district_fallback_coords(item.get('district', ''))
        item['latitude'], item['longitude'] = fallback
        
    # 2. Developer / Zastroyshchik
    dev_match = re.search(r'<span>Застройщик\s+([^<]+)</span>', html, re.IGNORECASE)
    if not dev_match:
        dev_match = re.search(r'Застройщик\s+([A-Za-z0-9А-Яа-я\s\-_]+)', html)
    if dev_match:
        item['developer'] = unescape(dev_match.group(1).strip())
    else:
        item['developer'] = item.get('object_name', 'MCHJ')
        
    # 3. Floors / Blocks / Apartments
    floor_match = re.search(r'Этажность:\s*<b>([0-9\-]+)</b>', html)
    item['floors'] = floor_match.group(1).strip() if floor_match else '9-16'
    
    apart_match = re.search(r'Количество\s+квартир:\s*<b>([0-9]+)</b>', html)
    item['apartment_count'] = apart_match.group(1).strip() if apart_match else '120'
    
    block_match = re.search(r'Блоков:\s*<b>([0-9]+)</b>', html)
    item['block_count'] = block_match.group(1).strip() if block_match else '3'
    
    # 4. Sales Office / Contact Details
    # Look for full phone in page
    phone_match = re.search(r'itemprop=[\'"]telephone[\'"][^>]+content=[\'"]([0-9]+)[\'"]', html)
    if phone_match and not item.get('phone'):
        item['phone'] = clean_phone(phone_match.group(1))
        
    # Check general phone numbers in page if card phone was empty
    if not item.get('phone'):
        gen_phones = re.findall(r'\+998[\s\(\)\-0-9]{9,15}', html)
        if gen_phones:
            item['phone'] = gen_phones[0].strip()
            
    # Email
    email_match = re.search(r'href=[\'"]mailto:([^\'"]+)[\'"]', html)
    if email_match:
        raw_email = email_match.group(1)
        # Decode urlencoded/html encoded email
        clean_email = urllib.parse.unquote(unescape(raw_email))
        item['email'] = clean_email
    else:
        item['email'] = ''
        
    # Telegram
    tg_match = re.search(r'href=[\'"]https://t\.me/([a-zA-Z0-9_\-]+)[\'"]', html)
    item['telegram'] = f"@{tg_match.group(1)}" if tg_match else ''
    
    item['sales_office'] = f"{item.get('district', 'Toshkent')}, {item.get('address', '')}"
    item['manager_name'] = 'Sotuv bo\'limi'
    item['manager_phone'] = item.get('phone', '')
    item['notes'] = f"Klass: {item.get('class_building', 'Komfort')} | Boshlang'ich narx: {item.get('price_from', 'Kelishiladi')}"
    item['priority'] = 'Yuqori' if 'Premium' in item.get('class_building', '') else 'Normal'
    item['last_visit'] = ''
    item['updated_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
    
    return item

def get_district_fallback_coords(district_str):
    """Return fallback latitude, longitude based on district string"""
    norm = re.sub(r'[^a-z0-9]', '', district_str.lower())
    for k, v in DISTRICT_COORDS.items():
        if k in norm:
            return v
    # Default Tashkent Center
    return (41.2995, 69.2401)

def scrape_domtut(limit=None, max_pages=None, city='all', fetch_details=True):
    """Main scraping orchestrator for Tashkent city and Tashkent region"""
    all_objects = []
    seen_slugs = set()
    
    targets = []
    if city in ('tashkent', 'all'):
        targets.append(('Tashkent', 'Toshkent shahri', 16))
    if city in ('viloyat', 'all'):
        targets.append(('Toshkent viloyati', 'Toshkent viloyati', 5))
        
    logger.info(f"Starting Domtut.uz collection for: {[t[0] for t in targets]}")
    
    for city_param, region_name, est_pages in targets:
        pages_to_check = max_pages if max_pages else est_pages
        logger.info(f"--- Scraping {region_name} (up to {pages_to_check} pages) ---")
        
        for p in range(1, pages_to_check + 1):
            if limit and len(all_objects) >= limit:
                break
                
            enc_city = urllib.parse.quote(city_param)
            url = f"{DOMTUT_BASE}/catalog-nedvijimosty?city={enc_city}&p={p}"
            logger.info(f"Fetching page {p}: {url}")
            
            html = fetch_url(url)
            if not html:
                logger.warning(f"Empty response on page {p}, skipping...")
                continue
                
            cards = extract_cards_from_html(html, region_name)
            logger.info(f"Found {len(cards)} TJM cards on page {p}")
            
            if not cards:
                # No more items in this section
                break
                
            for card in cards:
                if card['slug'] in seen_slugs:
                    continue
                seen_slugs.add(card['slug'])
                
                if fetch_details:
                    time.sleep(0.2)  # Respectful delay
                    card = enrich_from_detail_page(card)
                else:
                    fb = get_district_fallback_coords(card.get('district', ''))
                    card['latitude'], card['longitude'] = fb
                    card['developer'] = card.get('object_name', '')
                    card['floors'] = '9'
                    card['apartment_count'] = '100'
                    card['block_count'] = '2'
                    card['updated_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
                    
                all_objects.append(card)
                logger.info(f"[{len(all_objects)}] Extracted: {card['object_name']} ({card.get('district', '')}) - Lat: {card.get('latitude')}, Lng: {card.get('longitude')}")
                
                if limit and len(all_objects) >= limit:
                    break
                    
    logger.info(f"Collection complete! Total TJMs collected: {len(all_objects)}")
    return all_objects

def save_to_local_json(objects, filepath):
    """Save collected objects to local JSON cache for frontend/backend fallback"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(objects, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved {len(objects)} objects to local JSON: {filepath}")

def save_to_google_sheets(objects, credentials_path, sheet_id):
    """Save objects to Google Sheets worksheet 'UYSOT_Objects'"""
    try:
        import gspread
        from google.oauth2.service_account import Credentials
        
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        creds = Credentials.from_service_account_file(credentials_path, scopes=scopes)
        gc = gspread.authorize(creds)
        spreadsheet = gc.open_by_key(sheet_id)
        
        # Check if UYSOT_Objects sheet exists, if not create it
        sheet_title = 'UYSOT_Objects'
        try:
            ws = spreadsheet.worksheet(sheet_title)
        except gspread.exceptions.WorksheetNotFound:
            logger.info(f"Creating new worksheet: {sheet_title}")
            ws = spreadsheet.add_worksheet(title=sheet_title, rows=1000, cols=len(UYSOT_HEADERS))
            
        # Ensure header row
        curr_headers = ws.row_values(1)
        if curr_headers != UYSOT_HEADERS:
            logger.info("Setting header row in UYSOT_Objects sheet...")
            ws.update('A1', [UYSOT_HEADERS])
            
        # Prepare rows
        rows = []
        for obj in objects:
            row = [str(obj.get(h, '')) for h in UYSOT_HEADERS]
            rows.append(row)
            
        # Clear existing data rows (keep header) and re-write
        if rows:
            logger.info(f"Writing {len(rows)} rows to {sheet_title}...")
            # We can update in bulk starting from row 2
            ws.clear()
            all_values = [UYSOT_HEADERS] + rows
            ws.update('A1', all_values)
            logger.info("Google Sheets update successful!")
            return True
    except Exception as e:
        logger.error(f"Error saving to Google Sheets: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Domtut.uz Tashkent TJM Data Collector for UYSOT.UZ")
    parser.add_argument('--limit', type=int, default=None, help='Limit number of objects to collect')
    parser.add_argument('--pages', type=int, default=None, help='Limit number of pages to scan')
    parser.add_argument('--city', choices=['tashkent', 'viloyat', 'all'], default='all', help='Target city/region')
    parser.add_argument('--no-details', action='store_true', help='Skip fetching individual detail pages for speed')
    parser.add_argument('--json-only', action='store_true', help='Skip Google Sheets upload, save JSON only')
    args = parser.parse_args()
    
    # 1. Scrape objects
    objects = scrape_domtut(
        limit=args.limit,
        max_pages=args.pages,
        city=args.city,
        fetch_details=not args.no_details
    )
    
    # 2. Save locally to web/src/lib/uysot-domtut-data.json
    web_json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'web', 'src', 'lib', 'uysot-domtut-data.json'))
    save_to_local_json(objects, web_json_path)
    
    # 3. Save to Google Sheets if credentials exist
    if not args.json_only:
        creds_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'credentials.json'))
        sheet_id = '1ZmPUfae89OAiK4kJykrL4O3XaSrYUK8KoJlmCjYhzKA'
        if os.path.exists(creds_path):
            logger.info("Google Sheets credentials found. Syncing to UYSOT_Objects tab...")
            save_to_google_sheets(objects, creds_path, sheet_id)
        else:
            logger.warning("Google credentials.json not found in scraper/. Skipped Sheets upload.")

if __name__ == '__main__':
    main()
