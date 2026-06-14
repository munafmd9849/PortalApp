import {
  getGoogleSheetsSpreadsheetId,
  setGoogleSheetsSpreadsheetId,
} from '../services/googleSheetsConfig.js';
import { isGoogleSheetsCredentialsConfigured } from '../utils/googleSheetsExport.js';

export async function getGoogleSheetsSettings(req, res) {
  try {
    const spreadsheetId = getGoogleSheetsSpreadsheetId();
    const credentialsConfigured = isGoogleSheetsCredentialsConfigured();

    res.json({
      configured: Boolean(spreadsheetId && credentialsConfigured),
      spreadsheetId: spreadsheetId || null,
      spreadsheetUrl: spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        : null,
      credentialsConfigured,
    });
  } catch (error) {
    console.error('getGoogleSheetsSettings error:', error);
    res.status(500).json({ error: 'Failed to load Google Sheets settings' });
  }
}

export async function updateGoogleSheetsSettings(req, res) {
  try {
    const value = req.body?.spreadsheetUrl || req.body?.spreadsheetId;
    if (!value) {
      return res.status(400).json({ error: 'spreadsheetUrl or spreadsheetId is required' });
    }

    const id = setGoogleSheetsSpreadsheetId(value);
    res.json({
      success: true,
      spreadsheetId: id,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    });
  } catch (error) {
    console.error('updateGoogleSheetsSettings error:', error);
    res.status(400).json({ error: error.message || 'Failed to save Google Sheets settings' });
  }
}
