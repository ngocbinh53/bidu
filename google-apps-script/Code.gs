const SHEET_ID = '1VyR4JnFhwLnS_R0HqgZh4GibAHpFB25KnqLwtWtAKq8';
const SHEET_NAME = 'Work';
const FOOD_SHEET_NAME = 'food';
const DEFAULT_HEADERS = ['Date', 'Position', 'Location'];

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
}

function ensureHeaders(sheet) {
  const range = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), DEFAULT_HEADERS.length));
  const row = range.getValues()[0] || [];

  for (let i = 0; i < DEFAULT_HEADERS.length; i += 1) {
    if (!row[i]) {
      row[i] = DEFAULT_HEADERS[i];
    }
  }

  sheet.getRange(1, 1, 1, row.length).setValues([row]);
}

function normalizeRow(rawRow) {
  const item = {};

  DEFAULT_HEADERS.forEach((header, index) => {
    item[header] = rawRow[index] || '';
  });

  return {
    Date: item.Date || new Date().toISOString().slice(0, 10),
    Position: item.Position || 'KiDu',
    Location: item.Location || 'Bệnh viện'
  };
}

function getFoodMenu() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(FOOD_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Không tìm thấy tab "${FOOD_SHEET_NAME}"`);
  }

  const values = sheet.getDataRange().getValues();
  const headers = (values[0] || []).map((header) => String(header).trim().toLowerCase());
  const breakfastIndex = headers.indexOf('breakfast');
  const dinnerIndex = headers.indexOf('dinner');

  if (breakfastIndex === -1 || dinnerIndex === -1) {
    throw new Error('Tab Food cần có hai cột tiêu đề Breakfast và Dinner');
  }

  const getFoods = (columnIndex) => values.slice(1)
    .map((row) => String(row[columnIndex] ?? '').trim())
    .filter(Boolean);

  return {
    breakfast: getFoods(breakfastIndex),
    dinner: getFoods(dinnerIndex)
  };
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'food') {
      return ContentService
        .createTextOutput(JSON.stringify(getFoodMenu()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getSheet();
    ensureHeaders(sheet);

    const values = sheet.getDataRange().getValues();

    if (!values.length || values.length === 1) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = values[0].map((header) => header && String(header).trim());
    const rows = values.slice(1).map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        if (header) {
          item[header] = row[index] || '';
        }
      });
      return item;
    }).filter((row) => row.Date || row.Position || row.Location);

    return ContentService
      .createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const items = Array.isArray(payload.items) ? payload.items : [payload];
    const sheet = getSheet();
    ensureHeaders(sheet);

    const rows = items.map((item) => {
      const normalized = normalizeRow([
        item.Date || item.date || '',
        item.Position || item.position || item.label || '',
        item.Location || item.location || ''
      ]);

      return [
        normalized.Date,
        normalized.Position,
        normalized.Location
      ];
    });

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
