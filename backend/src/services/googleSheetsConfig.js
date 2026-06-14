import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSpreadsheetId } from '../utils/googleSheetsExport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../../data/google-sheets-config.json');

export function getGoogleSheetsSpreadsheetId() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const id = parseSpreadsheetId(data.spreadsheetId || data.spreadsheetUrl);
      if (id) return id;
    }
  } catch (error) {
    console.warn('Failed to read google-sheets-config.json:', error.message);
  }

  return parseSpreadsheetId(process.env.GOOGLE_SHEETS_SPREADSHEET_ID)
    || parseSpreadsheetId(process.env.GOOGLE_SHEETS_DIRECTORY_SPREADSHEET_ID);
}

export function setGoogleSheetsSpreadsheetId(urlOrId) {
  const id = parseSpreadsheetId(urlOrId);
  if (!id) {
    throw new Error('Invalid Google Sheets spreadsheet URL or ID');
  }

  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify({
      spreadsheetId: id,
      updatedAt: new Date().toISOString(),
    }, null, 2),
  );

  return id;
}
