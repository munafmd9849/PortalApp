/**
 * Admin Placement Readiness Controller
 * Metrics derived from real user activity — GET /api/admin/readiness/*
 */

import {
  getPlacementSummary,
  getStudentsWithScores,
  getStudentScoreDetail,
} from '../services/placementReadinessService.js';

export async function getSummary(req, res) {
  try {
    const data = await getPlacementSummary(req.query);
    res.json(data);
  } catch (error) {
    console.error('getSummary readiness error:', error);
    res.status(500).json({ error: 'Failed to fetch placement summary' });
  }
}

export async function getStudents(req, res) {
  try {
    const data = await getStudentsWithScores(req.query);
    res.json(data);
  } catch (error) {
    console.error('getStudents readiness error:', error);
    res.status(500).json({ error: 'Failed to fetch student readiness scores' });
  }
}

export async function getStudentDetail(req, res) {
  try {
    const { studentId } = req.params;
    const data = await getStudentScoreDetail(studentId);
    if (!data) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getStudentDetail readiness error:', error);
    res.status(500).json({ error: 'Failed to fetch student readiness detail' });
  }
}
