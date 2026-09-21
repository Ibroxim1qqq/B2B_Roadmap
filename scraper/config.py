# DSHK API Configuration
DSHK_API_BASE = 'https://api-dshk.shaffofqurilish.uz/api'
ENDPOINTS = {
    'list-construction': f'{DSHK_API_BASE}/list-construction',
    'get-gasn-info': f'{DSHK_API_BASE}/get-gasn-info',
    'sphere-list': f'{DSHK_API_BASE}/sphere-list',
    'country-list': f'{DSHK_API_BASE}/country-list',
    'get-construction-images': f'{DSHK_API_BASE}/get-construction-images'
}

# 14 Regions of Uzbekistan (DSHK Country ID -> Name & SOATO)
UZBEKISTAN_REGIONS = {
    1: {"name": "Andijon viloyati", "soato": "1703"},
    2: {"name": "Buxoro viloyati", "soato": "1706"},
    3: {"name": "Farg'ona viloyati", "soato": "1730"},
    4: {"name": "Jizzax viloyati", "soato": "1708"},
    5: {"name": "Xorazm viloyati", "soato": "1733"},
    6: {"name": "Namangan viloyati", "soato": "1714"},
    7: {"name": "Navoiy viloyati", "soato": "1712"},
    8: {"name": "Qashqadaryo viloyati", "soato": "1710"},
    9: {"name": "Qoraqalpog'iston Respublikasi", "soato": "1735"},
    10: {"name": "Samarqand viloyati", "soato": "1718"},
    11: {"name": "Sirdaryo viloyati", "soato": "1724"},
    12: {"name": "Surxondaryo viloyati", "soato": "1722"},
    13: {"name": "Toshkent viloyati", "soato": "1727"},
    14: {"name": "Toshkent shahri", "soato": "1726"}
}

# Filter Parameters: Ko'p xonadonli uy-joylar, Jarayonda
FILTER_PARAMS = {
    'sphere_id': 57,  # Ko'p xonadonli
    'status': 2       # Jarayonda
}

# Columns configuration
# Columns A-V
SOURCE_COLUMNS = [chr(i) for i in range(ord('A'), ord('W'))]
# Columns W-AH
INTERNAL_COLUMNS = ['W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH']

# Sheet Headers Mapping
SHEET_HEADERS = {
    'A': 'source_id',
    'B': 'object_name',
    'C': 'region_soato',
    'D': 'district_soato',
    'E': 'address',
    'F': 'latitude',
    'G': 'longitude',
    'H': 'status',
    'I': 'status_id',
    'J': 'sphere_id',
    'K': 'customer',
    'L': 'designer',
    'M': 'builder',
    'N': 'difficulty',
    'O': 'floors',
    'P': 'apartment_count',
    'Q': 'block_count',
    'R': 'deadline',
    'S': 'created_at',
    'T': 'task_id',
    'U': 'passport_url',
    'V': 'source_url'
}

# Rate Limit Delay in seconds
RATE_LIMIT_DELAY = 0.3
