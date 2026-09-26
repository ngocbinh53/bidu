const SHEET_ID = '1VyR4JnFhwLnS_R0HqgZh4GibAHpFB25KnqLwtWtAKq8';
const SHEET_NAME = 'Sheet1';
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
