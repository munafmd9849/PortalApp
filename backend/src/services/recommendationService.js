/**
 * Recommendation Service
 * Handles rule-based scoring for student-job matching
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Calculate match score for a student against a job
 * @param {Object} student - Student record with skills and other data
 * @param {Object} job - Job record with requiredSkills and eligibility
 * @returns {Object} Score details
 */
export function calculateMatchScore(student, job) {
  let score = 0;
  const breakdown = {
    skills: 0,
    cgpa: 0,
    profileCompletion: 0,
    activity: 0,
    pastPerformance: 0
  };

  // 1. Skills Match (40%)
  try {
    const requiredSkills = JSON.parse(job.requiredSkills || '[]');
    const studentSkills = student.skills.map(s => s.skillName.toLowerCase());
    
    if (requiredSkills.length > 0) {
      const matchedSkills = requiredSkills.filter(s => 
        studentSkills.includes(s.toLowerCase())
      );
      breakdown.skills = (matchedSkills.length / requiredSkills.length) * 40;
    } else {
      breakdown.skills = 40; // No specific skills required, assume full match
    }
  } catch (e) {
    logger.error('Error calculating skills match:', e);
  }

  // 2. CGPA Score (20%)
  if (job.minCgpa && student.cgpa) {
    const minCgpa = parseFloat(job.minCgpa);
    const studentCgpa = parseFloat(student.cgpa);
    if (!isNaN(minCgpa) && !isNaN(studentCgpa)) {
      if (studentCgpa >= minCgpa) {
        // Bonus for higher CGPA
        const diff = studentCgpa - minCgpa;
        breakdown.cgpa = 15 + Math.min(5, (diff / (10 - minCgpa)) * 5);
      } else {
        // Penalty for lower CGPA (though they might be ineligible)
        breakdown.cgpa = Math.max(0, (studentCgpa / minCgpa) * 10);
      }
    }
  } else {
    breakdown.cgpa = 15; // Default middle score
  }

  // 3. Profile Completion (10%)
  if (student.profileCompleted) breakdown.profileCompletion += 5;
  if (student.resumeUrl) breakdown.profileCompletion += 5;

  // 4. Activity Score (10%)
  // Based on statsApplied, statsShortlisted etc.
  const activityLevel = (student.statsApplied || 0) + (student.statsInterviewed || 0);
  breakdown.activity = Math.min(10, (activityLevel / 5) * 10);

  // 5. Past Performance (20%)
  // For now, use a simplified score. In future, integrate with Assessment scores.
  const performanceFactor = (student.statsOffers || 0) > 0 ? 20 : 10;
  breakdown.pastPerformance = performanceFactor;

  score = breakdown.skills + breakdown.cgpa + breakdown.profileCompletion + breakdown.activity + breakdown.pastPerformance;

  return {
    total: Math.min(100, Math.round(score * 100) / 100),
    breakdown
  };
}

/**
 * Rank students for a specific job based on eligibility and match score
 * @param {String} jobId - ID of the job
 * @returns {Array} List of ranked students
 */
export async function rankCandidatesForJob(jobId) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) throw new Error('Job not found');

    // Parse targeting criteria
    const targetSchools = JSON.parse(job.targetSchools || '[]');
    const targetCenters = JSON.parse(job.targetCenters || '[]');
    const targetBatches = JSON.parse(job.targetBatches || '[]');

    // Build student query filters based on job eligibility
    const where = {
      user: { status: 'ACTIVE' }
    };

    if (targetSchools.length > 0 && !targetSchools.includes('ALL')) {
      where.school = { in: targetSchools };
    }
    if (targetCenters.length > 0 && !targetCenters.includes('ALL')) {
      where.center = { in: targetCenters };
    }
    if (targetBatches.length > 0 && !targetBatches.includes('ALL')) {
      where.batch = { in: targetBatches };
    }

    // Fetch eligible students
    const students = await prisma.student.findMany({
      where,
      include: {
        skills: true,
        user: {
          select: {
            displayName: true,
            email: true
          }
        }
      }
    });

    // Score and rank
    const rankedCandidates = students.map(student => {
      const scoreData = calculateMatchScore(student, job);
      return {
        studentId: student.id,
        fullName: student.fullName,
        email: student.email,
        branch: student.school, // or appropriate field
        cgpa: student.cgpa,
        resumeStatus: student.resumeUrl ? 'Uploaded' : 'Missing',
        activityScore: student.statsApplied || 0,
        placementStatus: student.statsOffers > 0 ? 'Placed' : 'Available',
        matchScore: scoreData.total,
        scoreBreakdown: scoreData.breakdown
      };
    });

    // Sort by match score descending
    return rankedCandidates.sort((a, b) => b.matchScore - a.matchScore);

  } catch (error) {
    logger.error('Error ranking candidates:', error);
    throw error;
  }
}
