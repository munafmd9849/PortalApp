/**
 * Admin Student Directory — computed metrics, never stored on Student
 */

import {
  getStudentDirectory,
  getStudentDirectoryExport,
} from '../services/studentDirectoryMetricsService.js';
import { getStudentPanelExtras } from '../services/studentDirectoryPanelService.js';

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

export async function getStudentPanelData(req, res) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }
    const data = await getStudentPanelExtras(studentId);
    if (!data) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getStudentPanelData error:', error);
    res.status(500).json({ error: 'Failed to load student panel data' });
  }
}
