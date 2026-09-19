// Constants
const OBJECTS_SHEET = 'Objects';
const SETTINGS_SHEET = 'Settings';
const SYNC_LOG_SHEET = 'SyncLog';

// SOURCE columns (A-V)
const SOURCE_COLUMNS_COUNT = 22;

/**
 * Helper to return JSON response with correct headers.
 * JSON formatida javob qaytarish uchun yordamchi funksiya.
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get Sheet by name
 * Listni nomi bo'yicha olish
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet found. Please bind script to a sheet.");
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet '${sheetName}' not found.`);
  return sheet;
}

/**
 * Helper function to find column index by header name
 * Ustun nomiga qarab indeksini topish
 */
function getColumnIndex(headers, columnName) {
  const index = headers.indexOf(columnName);
  return index !== -1 ? index : null;
}

/**
 * Convert row array to object
 * Qator (array) ni obyektga aylantirish
 */
function rowToObject(headers, rowData) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    if (headers[i]) {
      obj[headers[i]] = rowData[i];
    }
  }
  return obj;
}

/**
 * GET Request Handler
 * GET so'rovlarni qabul qilish
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (!action) {
      return jsonResponse({error: "Action parameter is missing."});
    }

    switch (action) {
      case 'getMarkers':
        return jsonResponse(getMarkers());
      case 'getObject':
        return jsonResponse(getObject(e.parameter.id));
      case 'getSettings':
        return jsonResponse(getSettings());
      case 'getStats':
        return jsonResponse(getStats());
      case 'getSyncStatus':
        return jsonResponse(getSyncStatus());
      case 'getDistricts':
        return jsonResponse(getDistricts());
      default:
        return jsonResponse({error: 'Unknown GET action', action: action});
    }
  } catch (error) {
    return jsonResponse({error: error.toString()});
  }
}

/**
 * POST Request Handler
 * POST so'rovlarni qabul qilish
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("No POST data received.");
    }

    const postData = JSON.parse(e.postData.contents);
    const action = e.parameter.action || postData.action; 
    
    switch (action) {
      case 'updateObject':
        return jsonResponse(updateObject(postData.source_id, postData.data));
      case 'recordVisit':
        return jsonResponse(recordVisit(postData.source_id, postData.visited_by, postData.lat_lng));
      case 'addCustomField':
        return jsonResponse(addCustomField(postData));
      case 'toggleFieldVisibility':
        return jsonResponse(toggleFieldVisibility(postData.field_name));
      default:
        return jsonResponse({error: 'Unknown POST action', action: action});
    }
  } catch (error) {
    return jsonResponse({error: error.toString()});
  }
}

// ==========================================
// GET Endpoints
// ==========================================

function getMarkers() {
  const sheet = getSheet(OBJECTS_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Only headers or empty
  
  const headers = data[0];
  
  const idxId = getColumnIndex(headers, 'source_id');
  const idxName = getColumnIndex(headers, 'object_name');
  const idxLat = getColumnIndex(headers, 'latitude');
  const idxLng = getColumnIndex(headers, 'longitude');
  const idxStatus = getColumnIndex(headers, 'status');
  const idxStatusId = getColumnIndex(headers, 'status_id');
  const idxDistrict = getColumnIndex(headers, 'district_soato');
  
  const markers = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const lat = row[idxLat];
    const lng = row[idxLng];
    
    // Only return objects that have valid lat/lng
    if (lat && lng) {
      markers.push({
        source_id: row[idxId],
        object_name: row[idxName],
        latitude: lat,
        longitude: lng,
        status: row[idxStatus],
        status_id: row[idxStatusId],
        district_soato: row[idxDistrict]
      });
    }
  }
  
  return markers;
}

function getObject(source_id) {
  if (!source_id) throw new Error("id parameter is required for getObject");
  
  const sheet = getSheet(OBJECTS_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) throw new Error("No data in Objects sheet");
  
  const headers = data[0];
  const idxId = getColumnIndex(headers, 'source_id');
  
  if (idxId === null) throw new Error("source_id column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idxId] == source_id) {
      const row = data[i];
      const result = { source: {}, internal: {} };
      
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (!key) continue;
        
        // Col A is 0, col V is 21
        if (j < SOURCE_COLUMNS_COUNT) {
          result.source[key] = row[j];
        } else {
          result.internal[key] = row[j];
        }
      }
      return result;
    }
  }
  
  return {error: "Object not found"};
}

function getSettings() {
  const sheet = getSheet(SETTINGS_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const settings = [];
  
  for (let i = 1; i < data.length; i++) {
    settings.push(rowToObject(headers, data[i]));
  }
  
  return settings;
}

function getStats() {
  const sheet = getSheet(OBJECTS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  let total = 0;
  let with_internal = 0;
  let visited = 0;
  let with_phone = 0;
  let with_manager = 0;

  if (data.length > 1) {
    const headers = data[0];
    const idxTjm = getColumnIndex(headers, 'tjm_name');
    const idxPhone = getColumnIndex(headers, 'phone');
    const idxVisit = getColumnIndex(headers, 'last_visit');
    const idxManager = getColumnIndex(headers, 'manager_name');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      total++;
      
      // Basic check for internal data existing
      if (idxTjm !== null && row[idxTjm]) with_internal++;
      if (idxVisit !== null && row[idxVisit]) visited++;
      if (idxPhone !== null && row[idxPhone]) with_phone++;
      if (idxManager !== null && row[idxManager]) with_manager++;
    }
  }

  return {
    total: total,
    with_internal: with_internal,
    without_internal: total - with_internal,
    visited: visited,
    not_visited: total - visited,
    with_phone: with_phone,
    with_manager: with_manager
  };
}

function getSyncStatus() {
  const sheet = getSheet(SYNC_LOG_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { last_sync: null };
  
  const headers = data[0];
  // Assuming the newest sync log is at the bottom (or row 2 if descending)
  // Let's just return the last row's data
  const lastRow = data[data.length - 1];
  return rowToObject(headers, lastRow);
}

function getDistricts() {
  const sheet = getSheet(OBJECTS_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const idxDistrict = getColumnIndex(headers, 'district_soato');
  
  if (idxDistrict === null) return [];
  
  const districtSet = new Set();
  for (let i = 1; i < data.length; i++) {
    const dist = data[i][idxDistrict];
    if (dist) districtSet.add(dist);
  }
  
  return Array.from(districtSet);
}

// ==========================================
// POST Endpoints
// ==========================================

function updateObject(source_id, updateData) {
  if (!source_id) throw new Error("source_id is required");
  if (!updateData || typeof updateData !== 'object') throw new Error("data object is required");
  
  const sheet = getSheet(OBJECTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idxId = getColumnIndex(headers, 'source_id');
  if (idxId === null) throw new Error("source_id column not found");

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxId] == source_id) {
      rowIndex = i + 1; // 1-based for Apps Script rows
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error("Object not found");
  }

  // Update only internal fields
  for (const [key, value] of Object.entries(updateData)) {
    const colIndex = getColumnIndex(headers, key);
    if (colIndex !== null) {
      // Security check: Only update columns W-AH (index >= SOURCE_COLUMNS_COUNT)
      if (colIndex >= SOURCE_COLUMNS_COUNT) {
        // Apps Script is 1-based for rows and columns
        sheet.getRange(rowIndex, colIndex + 1).setValue(value);
      }
    }
  }
  
  return {success: true};
}

function recordVisit(source_id, visited_by, lat_lng) {
  if (!source_id) throw new Error("source_id is required");
  
  const now = new Date().toISOString();
  
  return updateObject(source_id, {
    last_visit: now,
    visited_by: visited_by || '',
    visit_lat_lng: lat_lng || ''
  });
}

function addCustomField(params) {
  const { field_name, field_type, required, visible } = params;
  if (!field_name || !field_type) throw new Error("field_name and field_type are required");
  
  const objectsSheet = getSheet(OBJECTS_SHEET);
  const settingsSheet = getSheet(SETTINGS_SHEET);
  
  // 1. Add column to Objects sheet
  const headers = objectsSheet.getRange(1, 1, 1, objectsSheet.getLastColumn()).getValues()[0];
  if (headers.includes(field_name)) {
    throw new Error(`Field '${field_name}' already exists.`);
  }
  
  const newColIndex = headers.length + 1;
  objectsSheet.getRange(1, newColIndex).setValue(field_name);
  
  // Get column letter (e.g. AI)
  const colLetter = objectsSheet.getRange(1, newColIndex).getA1Notation().replace(/[0-9]/g, '');
  
  // 2. Add entry to Settings sheet
  const isRequired = required === true || required === 'true';
  const isVisible = visible !== false && visible !== 'false'; // default true
  
  settingsSheet.appendRow([field_name, field_type, isRequired, isVisible, colLetter]);
  
  return {success: true, column_letter: colLetter};
}

function toggleFieldVisibility(field_name) {
  if (!field_name) throw new Error("field_name is required");
  
  const sheet = getSheet(SETTINGS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idxName = getColumnIndex(headers, 'field_name');
  const idxVisible = getColumnIndex(headers, 'visible');
  
  if (idxName === null || idxVisible === null) {
    throw new Error("Settings sheet missing required headers (field_name, visible)");
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxName] === field_name) {
      const currentVal = data[i][idxVisible];
      const newVal = !currentVal;
      sheet.getRange(i + 1, idxVisible + 1).setValue(newVal);
      return {success: true, field_name: field_name, visible: newVal};
    }
  }
  
  throw new Error("Field not found in Settings");
}
