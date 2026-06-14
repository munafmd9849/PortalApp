import fs from 'fs';
import { google } from 'googleapis';

export function parseSpreadsheetId(urlOrId) {
  if (!urlOrId) return null;
  const trimmed = String(urlOrId).trim();
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || null;
}

export function loadServiceAccountCredentials() {
  const json = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
    || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  const keyPath = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY_PATH
    || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }

  throw new Error(
    'Google Sheets service account not configured. Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY_PATH.',
  );
}

export function isGoogleSheetsCredentialsConfigured() {
  try {
    loadServiceAccountCredentials();
    return true;
  } catch {
    return false;
  }
}

function sanitizeTabName(name) {
  return String(name)
    .replace(/[\\/?*[\]]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: loadServiceAccountCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function getExistingSheetTitles(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });
  return (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
}

async function resolveUniqueTabName(sheets, spreadsheetId, baseName) {
  const existing = new Set(await getExistingSheetTitles(sheets, spreadsheetId));
  if (!existing.has(baseName)) return baseName;

  for (let i = 2; i <= 99; i += 1) {
    const suffix = `_${i}`;
    const candidate = `${baseName.slice(0, 100 - suffix.length)}${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }

  throw new Error('Could not create a unique tab name in the spreadsheet');
}

function escapeSheetRange(tabName) {
  return `'${String(tabName).replace(/'/g, "''")}'`;
}

/**
 * Create a new tab and write header + data rows (snapshot export, not live sync).
 */
export async function appendSnapshotToNewTab({ spreadsheetId, tabName, headers, rows }) {
  const sheets = await getSheetsClient();
  const safeTabName = sanitizeTabName(tabName);
  const uniqueTabName = await resolveUniqueTabName(sheets, spreadsheetId, safeTabName);

  const batchRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        addSheet: {
          properties: { title: uniqueTabName },
        },
      }],
    },
  });

  const sheetId = batchRes.data.replies?.[0]?.addSheet?.properties?.sheetId;
  const values = [
    headers,
    ...rows.map((row) => row.map((cell) => (cell == null ? '' : String(cell)))),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${escapeSheetRange(uniqueTabName)}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  if (sheetId != null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        }],
      },
    }).catch(() => {});
  }

  return {
    tabName: uniqueTabName,
    rowCount: rows.length,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`,
  };
}
