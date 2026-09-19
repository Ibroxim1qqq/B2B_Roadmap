# DSHK API Configuration
DSHK_API_BASE = 'https://api-dshk.shaffofqurilish.uz/api'
ENDPOINTS = {
    'list-construction': f'{DSHK_API_BASE}/list-construction',
    'get-gasn-info': f'{DSHK_API_BASE}/get-gasn-info',
    'sphere-list': f'{DSHK_API_BASE}/sphere-list',
    'country-list': f'{DSHK_API_BASE}/country-list',
    'get-construction-images': f'{DSHK_API_BASE}/get-construction-images'
}

# Filter Parameters
FILTER_PARAMS = {
    'country_id': 10, # Samarqand
    'sphere_id': 57,  # Ko\'p xonadonli
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
