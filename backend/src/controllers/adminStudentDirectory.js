/**
 * Admin Student Directory — computed metrics, never stored on Student
 */

import {
  getStudentDirectory,
  getStudentDirectoryExport,
} from '../services/studentDirectoryMetricsService.js';

export async function getDirectory(req, res) {
  try {
    const data = await getStudentDirectory(req.query);
    res.json(data);
  } catch (error) {
    console.error('getDirectory error:', error);
    res.status(500).json({ error: 'Failed to fetch student directory' });
  }
}

export async function exportDirectory(req, res) {
  try {
    const data = await getStudentDirectoryExport(req.query);
    res.json(data);
  } catch (error) {
    console.error('exportDirectory error:', error);
    res.status(500).json({ error: 'Failed to export student directory' });
  }
}
