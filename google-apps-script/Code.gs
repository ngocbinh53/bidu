const SHEET_ID = '1VyR4JnFhwLnS_R0HqgZh4GibAHpFB25KnqLwtWtAKq8';
const SHEET_NAME = 'Sheet1';
const DEFAULT_HEADERS = ['label', 'day', 'date', 'location', 'createdAt'];

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
    id: `${item.date || 'date'}-${item.location || 'location'}-${Date.now()}`,
    label: item.label || 'KiDu',
    day: item.day || 'Thứ',
    date: item.date || new Date().toISOString().slice(0, 10),
    location: item.location || 'Bệnh viện',
    createdAt: item.createdAt || new Date().toISOString()
  };
}

function doGet() {
  try {
    const sheet = getSheet();
    ensureHeaders(sheet);

    const values = sheet.getDataRange().getValues();

    if (!values.length || values.length === 1) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = values[0];
    const rows = values.slice(1).map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter((row) => row.label || row.date || row.location);

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
        item.label || '',
        item.day || '',
        item.date || '',
        item.location || '',
        new Date().toISOString()
      ]);

      return [
        normalized.label,
        normalized.day,
        normalized.date,
        normalized.location,
        normalized.createdAt
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
