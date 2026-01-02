/**
 * Student Controller
 * Replaces Firebase Firestore student service calls
 * Handles all student-related operations
 */

import prisma from '../config/database.js';
import { uploadToS3, deleteFromS3 } from '../config/s3.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { generateProjectContent } from '../services/aiService.js';

async function updateUserProfilePhoto(userId, profilePhotoValue) {
  if (profilePhotoValue === undefined) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhoto: profilePhotoValue,
    },
  });
}

/**
 * Get student profile
 * Replaces: getStudentProfile()
 */
export async function getStudentProfile(req, res) {
  try {
    const { studentId } = req.params;
    const userId = studentId || req.userId;

    console.log('🔍 [getStudentProfile] Request received:', {
      studentId,
      reqUserId: req.userId,
      finalUserId: userId,
    });

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // SINGLE CONSOLIDATED PRISMA QUERY
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            profilePhoto: true,
          },
        },
        skills: true,
        education: {
          orderBy: { endYear: 'desc' },
        },
        experiences: {
          orderBy: { start: 'desc' },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
        },
        achievements: {
          orderBy: { createdAt: 'desc' },
        },
        certifications: {
          orderBy: { issuedDate: 'desc' },
        },
        codingProfiles: true,
      },
    });

    // CRITICAL: Verify data ownership
    console.log('🔍 [getStudentProfile] Student found:', {
      studentId: student?.id,
      userId: student?.userId,
      fullName: student?.fullName,
      email: student?.email,
    });

    if (!student) {
      console.log('⚠️ [getStudentProfile] Student not found, returning empty profile');
      // Return empty profile structure instead of 404 for new users
      return res.json({
        id: null,
        userId,
        fullName: '',
        email: '',
        phone: '',
        enrollmentId: '',
        school: '',
        center: '',
        batch: '',
        skills: [],
        education: [],
        projects: [],
        achievements: [],
        certifications: [],
        codingProfiles: [],
        experiences: [],
      });
    }

    // NORMALIZE: Ensure arrays are never null, always []
    const normalizedData = {
      ...student,
      skills: Array.isArray(student.skills) ? student.skills : [],
      education: Array.isArray(student.education) ? student.education : [],
      projects: Array.isArray(student.projects) ? student.projects : [],
      achievements: Array.isArray(student.achievements) ? student.achievements : [],
      certifications: Array.isArray(student.certifications) ? student.certifications : [],
      experiences: Array.isArray(student.experiences) ? student.experiences : [],
      codingProfiles: Array.isArray(student.codingProfiles) ? student.codingProfiles : [],
      profilePhoto: student.user?.profilePhoto || null,
    };

    // Remove user relation from response (we only need profilePhoto)
    delete normalizedData.user;

    // CRITICAL: Log counts before sending response
    console.log('📊 [getStudentProfile] Data counts:', {
      studentId: normalizedData.id,
      skills: normalizedData.skills.length,
      education: normalizedData.education.length,
      projects: normalizedData.projects.length,
      achievements: normalizedData.achievements.length,
      certifications: normalizedData.certifications.length,
      experiences: normalizedData.experiences.length,
      codingProfiles: normalizedData.codingProfiles.length,
    });

    // Verify projects ownership
    if (normalizedData.projects.length > 0) {
      const allProjectsMatch = normalizedData.projects.every(
        p => p.studentId === normalizedData.id
      );
      console.log('✅ [getStudentProfile] Projects ownership check:', {
        allProjectsMatch,
        projectCount: normalizedData.projects.length,
        firstProjectStudentId: normalizedData.projects[0]?.studentId,
        studentId: normalizedData.id,
      });
    }

    // Verify achievements ownership
    if (normalizedData.achievements.length > 0) {
      const allAchievementsMatch = normalizedData.achievements.every(
        a => a.studentId === normalizedData.id
      );
      console.log('✅ [getStudentProfile] Achievements ownership check:', {
        allAchievementsMatch,
        achievementCount: normalizedData.achievements.length,
      });
    }

    // Verify certifications ownership
    if (normalizedData.certifications.length > 0) {
      const allCertificationsMatch = normalizedData.certifications.every(
        c => c.studentId === normalizedData.id
      );
      console.log('✅ [getStudentProfile] Certifications ownership check:', {
        allCertificationsMatch,
        certificationCount: normalizedData.certifications.length,
      });
    }

    // SINGLE CANONICAL RESPONSE - All data at top level
    console.log('📤 [getStudentProfile] Sending response with data counts:', {
      projects: normalizedData.projects.length,
      achievements: normalizedData.achievements.length,
      certifications: normalizedData.certifications.length,
    });

    res.json(normalizedData);
  } catch (error) {
    console.error('❌ [getStudentProfile] Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    res.status(500).json({ 
      error: 'Failed to get student profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Update student profile
 * Replaces: updateCompleteStudentProfile()
 */
export async function updateStudentProfile(req, res) {
  try {
    const userId = req.userId;
    const profileData = req.body;
    const userRole = req.user?.role;
    
    // For admin users, allow updating other students' profiles if studentId is provided
    let targetUserId = userId;
    if (userRole === 'ADMIN' && profileData.studentId) {
      // Admin is updating another student's profile
      const targetStudent = await prisma.student.findUnique({
        where: { id: profileData.studentId },
        select: { userId: true },
      });
      if (!targetStudent) {
        return res.status(404).json({ error: 'Student not found' });
      }
      targetUserId = targetStudent.userId;
      // Remove studentId from profileData as it's not a student field
      delete profileData.studentId;
    }
    
    const hasProfilePhotoField = Object.prototype.hasOwnProperty.call(profileData, 'profilePhoto');
    const rawProfilePhoto = hasProfilePhotoField ? profileData.profilePhoto : undefined;
    const trimmedProfilePhoto =
      typeof rawProfilePhoto === 'string' ? rawProfilePhoto.trim() : rawProfilePhoto;
    const normalizedProfilePhoto = hasProfilePhotoField ? (trimmedProfilePhoto || null) : undefined;

    // Check if student exists first
    const existingStudent = await prisma.student.findUnique({
      where: { userId: targetUserId },
    });

    if (hasProfilePhotoField) {
      await updateUserProfilePhoto(targetUserId, normalizedProfilePhoto);
    }

    // If student doesn't exist, create it (defensive programming)
    if (!existingStudent) {
      // Get user info for default values
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { email: true, role: true },
      });

      if (!user || user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Access denied. Student profile required.' });
      }

      // Clean profileData before creating (same cleaning logic as update)
      const fieldMapping = {
        'Headline': 'headline',
        'headline': 'headline',
        'profilePhoto': null, // Not a Student field, skip it
      };

      const allowedFields = [
        'fullName', 'email', 'phone', 'enrollmentId', 'cgpa',
        'batch', 'center', 'school',
        'bio', 'headline', 'city', 'stateRegion', 'jobFlexibility',
        'linkedin', 'githubUrl', 'youtubeUrl', 'leetcode', 'codeforces', 'gfg', 'hackerrank',
        'resumeUrl', 'resumeFileName', 'resumeUploadedAt',
        'statsApplied', 'statsShortlisted', 'statsInterviewed', 'statsOffers',
        'emailNotificationsDisabled'
      ];

      const urlFields = ['linkedin', 'githubUrl', 'youtubeUrl', 'leetcode', 'codeforces', 'gfg', 'hackerrank'];

      const cleanData = {};
      Object.keys(profileData).forEach(key => {
        const mappedKey = fieldMapping[key] !== undefined ? fieldMapping[key] : key;
        if (mappedKey === null || !allowedFields.includes(mappedKey)) {
          return;
        }
        let value = profileData[key];
        if (value === undefined || value === null) {
          return;
        }
        if (typeof value === 'string') {
          value = value.trim();
          const optionalFields = ['bio', 'headline', 'city', 'stateRegion', 'jobFlexibility',
                                 'linkedin', 'githubUrl', 'youtubeUrl', 'leetcode', 'codeforces', 'gfg', 'hackerrank'];
          if (value === '' && optionalFields.includes(mappedKey)) {
            cleanData[mappedKey] = null;
            return;
          }
          if (value === '') {
            return;
          }
          if (urlFields.includes(mappedKey) && !value.startsWith('http://') && !value.startsWith('https://')) {
            value = 'https://' + value;
          }
          cleanData[mappedKey] = value;
        } else {
          cleanData[mappedKey] = value;
        }
      });

      // Normalize email if provided
      if (cleanData.email && typeof cleanData.email === 'string') {
        cleanData.email = cleanData.email.toLowerCase().trim();
      }

      // Ensure required fields have defaults
      const studentData = {
        userId: targetUserId,
        email: cleanData.email || user.email,
        fullName: cleanData.fullName || user.email, // Use email as fallback for name
        phone: cleanData.phone || null,
        enrollmentId: cleanData.enrollmentId || null,
        school: cleanData.school || null,
        center: cleanData.center || null,
        batch: cleanData.batch || null,
        ...cleanData, // Spread cleanData to include other fields like bio, headline, etc.
      };

      console.log('Creating student with data:', { userId: targetUserId, email: studentData.email, fullName: studentData.fullName });

      // Create student record with cleaned data
      const student = await prisma.student.create({
        data: studentData,
        include: {
          skills: true,
          education: { orderBy: { endYear: 'desc' } },
          projects: { orderBy: { createdAt: 'desc' } },
          achievements: { orderBy: { createdAt: 'desc' } },
          certifications: { orderBy: { issuedDate: 'desc' } },
          codingProfiles: true,
        },
      });

      // Sync coding profiles if any (don't fail creation if sync fails)
      if (cleanData.linkedin || cleanData.githubUrl || cleanData.youtubeUrl ||
          cleanData.leetcode || cleanData.codeforces || cleanData.gfg || cleanData.hackerrank) {
        try {
          await syncCodingProfiles(targetUserId, cleanData);
        } catch (syncError) {
          console.warn('Failed to sync coding profiles during creation (non-fatal):', syncError);
        }
      }

      return res.json(student);
    }

    // Field mapping from frontend to backend (handle case differences)
    const fieldMapping = {
      'Headline': 'headline', // Frontend sends 'Headline', backend expects 'headline'
      'headline': 'headline',
      'profilePhoto': null, // Not a Student field, skip it
    };

    // List of allowed Student model fields (exclude relations, computed fields)
    const allowedFields = [
      'fullName', 'email', 'phone', 'enrollmentId', 'cgpa',
      'batch', 'center', 'school',
      'bio', 'headline', 'city', 'stateRegion', 'jobFlexibility',
      'linkedin', 'githubUrl', 'youtubeUrl', 'leetcode', 'codeforces', 'gfg', 'hackerrank',
      'resumeUrl', 'resumeFileName', 'resumeUploadedAt',
      'statsApplied', 'statsShortlisted', 'statsInterviewed', 'statsOffers',
      'emailNotificationsDisabled'
    ];

    // URL fields that need normalization
    const urlFields = ['linkedin', 'githubUrl', 'youtubeUrl', 'leetcode', 'codeforces', 'gfg', 'hackerrank'];

    // Remove undefined/null/empty string fields and filter by allowed fields
    // Also exclude fields that shouldn't be updated (userId, id, timestamps, relations)
    const cleanData = {};
    Object.keys(profileData).forEach(key => {
      // Map field name if needed
      const mappedKey = fieldMapping[key] !== undefined ? fieldMapping[key] : key;
      
      // Skip if mapped to null (field not in Student model)
      if (mappedKey === null) {
        return;
      }
      
      // Skip if field not in allowed list
      if (!allowedFields.includes(mappedKey)) {
        return;
      }
      
      let value = profileData[key];
      
      // Skip undefined/null values
      if (value === undefined || value === null) {
        return;
      }
      
      // Handle string values
      if (typeof value === 'string') {
        value = value.trim();
        
        // For empty strings in optional fields, set to null (skip for required fields)
        const optionalFields = ['bio', 'headline', 'city', 'stateRegion', 'jobFlexibility', 
                               'linkedin', 'githubUrl', 'youtubeUrl', 'leetcode', 'codeforces', 'gfg', 'hackerrank'];
        
        if (value === '' && optionalFields.includes(mappedKey)) {
          cleanData[mappedKey] = null;
          return;
        }
        
        // Skip empty strings for required fields (don't update them)
        if (value === '') {
          return;
        }
        
        // Normalize URLs (only for URL fields with non-empty values)
        if (urlFields.includes(mappedKey) && !value.startsWith('http://') && !value.startsWith('https://')) {
          value = 'https://' + value;
        }
        
        cleanData[mappedKey] = value;
      } else {
        // Non-string values (numbers, booleans, etc.)
        cleanData[mappedKey] = value;
      }
    });

    // Normalize email if provided
    if (cleanData.email && typeof cleanData.email === 'string') {
      cleanData.email = cleanData.email.toLowerCase().trim();
    }

    // Normalize string fields (trim whitespace)
    const stringFields = ['fullName', 'phone', 'enrollmentId', 'batch', 'center', 'school', 'bio', 'headline', 'jobFlexibility'];
    stringFields.forEach(field => {
      if (cleanData[field] && typeof cleanData[field] === 'string') {
        cleanData[field] = cleanData[field].trim();
      }
    });

    // Handle otherProfiles - ensure it's a valid JSON string
    if (cleanData.otherProfiles !== undefined) {
      if (typeof cleanData.otherProfiles === 'string') {
        try {
          // Validate it's valid JSON
          const parsed = JSON.parse(cleanData.otherProfiles);
          if (Array.isArray(parsed)) {
            // Filter out invalid entries and ensure proper structure
            const validProfiles = parsed.filter(p => p && typeof p === 'object' && p.platformName && p.profileId);
            cleanData.otherProfiles = JSON.stringify(validProfiles);
          } else {
            delete cleanData.otherProfiles;
          }
        } catch (e) {
          // Invalid JSON, remove it
          delete cleanData.otherProfiles;
        }
      } else if (Array.isArray(cleanData.otherProfiles)) {
        // If it's already an array, stringify it
        const validProfiles = cleanData.otherProfiles.filter(p => p && typeof p === 'object' && p.platformName && p.profileId);
        cleanData.otherProfiles = JSON.stringify(validProfiles);
      } else {
        delete cleanData.otherProfiles;
      }
    }

    // Capitalize first letter of city and stateRegion
    const capitalizeFirstLetter = (str) => {
      if (!str || typeof str !== 'string' || !str.trim()) return str;
      const trimmed = str.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    };

    if (cleanData.city && typeof cleanData.city === 'string') {
      cleanData.city = capitalizeFirstLetter(cleanData.city.trim());
    }
    if (cleanData.stateRegion && typeof cleanData.stateRegion === 'string') {
      cleanData.stateRegion = capitalizeFirstLetter(cleanData.stateRegion.trim());
    }

    // If cleanData is empty, return existing student (nothing to update)
    if (Object.keys(cleanData).length === 0) {
      return res.json(existingStudent);
    }

    // Update student profile
    const student = await prisma.student.update({
      where: { userId: targetUserId },
      data: cleanData,
      include: {
        skills: true,
        education: { orderBy: { endYear: 'desc' } },
        projects: { orderBy: { createdAt: 'desc' } },
        achievements: { orderBy: { createdAt: 'desc' } },
        certifications: { orderBy: { issuedDate: 'desc' } },
        codingProfiles: true,
      },
    });

    // Sync coding profiles if any (don't fail update if sync fails)
    if (profileData.linkedin || profileData.githubUrl || profileData.youtubeUrl ||
        profileData.leetcode || profileData.codeforces || profileData.gfg || profileData.hackerrank) {
      try {
        await syncCodingProfiles(targetUserId, profileData);
      } catch (syncError) {
        // Log but don't fail the entire update if sync fails
        console.warn('Failed to sync coding profiles (non-fatal):', syncError);
      }
    }

    res.json(student);
  } catch (error) {
    console.error('Update student profile error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      userId: req.userId,
      profileDataKeys: Object.keys(req.body || {}),
    });
    
    // Provide more specific error messages
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Student profile not found for update' });
    }
    if (error.code === 'P2002') {
      const field = error.meta?.target?.join(', ') || 'field';
      return res.status(400).json({ 
        error: `Profile update failed: A student with this ${field} already exists`,
        field: error.meta?.target?.[0]
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid data provided for a relationship field' });
    }
    
    // Log the actual error for debugging
    const errorMessage = error.message || 'Unknown error';
    console.error('Profile update failed with error:', errorMessage);
    
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

/**
 * Get student skills
 * Replaces: getStudentSkills()
 */
export async function getStudentSkills(req, res) {
  try {
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    // If student doesn't exist yet, return empty array (for new users)
    if (!student) {
      return res.json([]);
    }

    const skills = await prisma.skill.findMany({
      where: { studentId: student.id },
      orderBy: { skillName: 'asc' },
    });

    res.json(skills);
  } catch (error) {
    console.error('Get student skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
}

/**
 * Add or update skill
 * Replaces: addOrUpdateSkill()
 */
export async function addOrUpdateSkill(req, res) {
  try {
    const userId = req.userId;
    const { skillName, rating } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const skill = await prisma.skill.upsert({
      where: {
        studentId_skillName: {
          studentId: student.id,
          skillName,
        },
      },
      update: { rating },
      create: {
        studentId: student.id,
        skillName,
        rating: rating || 1,
      },
    });

    res.json(skill);
  } catch (error) {
    console.error('Add/update skill error:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
}

/**
 * Delete skill
 */
export async function deleteSkill(req, res) {
  try {
    const { skillId } = req.params;

    await prisma.skill.delete({
      where: { id: skillId },
    });

    res.json({ message: 'Skill deleted' });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
}

/**
 * Get all students (admin)
 * Replaces: getAllStudents()
 */
export async function getAllStudents(req, res) {
  try {
    console.log('📥 getAllStudents - Request received');
    console.log('   User ID:', req.userId);
    console.log('   User Role:', req.user?.role);
    console.log('   Query params:', req.query);

    const { school, center, batch, status, page = 1, limit = 50 } = req.query;

    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50)); // Max 100, min 1

    const where = {};
    if (school) where.school = school;
    if (center) where.center = center;
    if (batch) where.batch = batch;
    // Note: status filtering would require joining with User table
    // For now, we'll filter in-memory after fetching

    console.log('📊 getAllStudents - Executing Prisma query...');
    console.log('   Where clause:', where);
    console.log('   Pagination:', { page: pageNum, limit: limitNum });

    // FIX 1: Wrap Prisma query in try-catch for relation loading
    // FIX 2: Use defensive approach - handle missing user relations gracefully
    let students = [];
    let totalCount = 0;

    try {
      // Try to fetch with include first
      [students, totalCount] = await Promise.all([
        prisma.student.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                status: true,
                emailVerified: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.student.count({ where }),
      ]);
    } catch (queryError) {
      // FIX 3: If include fails (e.g., missing user records), try without include
      console.warn('⚠️ Query with include failed, trying without include:', queryError.message);
      
      try {
        [students, totalCount] = await Promise.all([
          prisma.student.findMany({
            where,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.student.count({ where }),
        ]);

        // FIX 4: Manually load user data for students (if needed)
        // Only load user data if status filter is requested
        if (status && students.length > 0) {
          const userIds = students.map(s => s.userId).filter(Boolean);
          if (userIds.length > 0) {
            const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: {
                id: true,
                status: true,
                emailVerified: true,
                createdAt: true,
              },
            });

            // Map users to students
            const userMap = new Map(users.map(u => [u.id, u]));
            students = students.map(student => ({
              ...student,
              user: userMap.get(student.userId) || null,
            }));
          } else {
            // No userIds found, add null user to all students
            students = students.map(student => ({
              ...student,
              user: null,
            }));
          }
        } else {
          // No status filter, add null user placeholder
          students = students.map(student => ({
            ...student,
            user: null,
          }));
        }
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        throw fallbackError; // Re-throw to be caught by outer catch
      }
    }

    console.log('✅ getAllStudents - Query successful');
    console.log('   Found students:', students.length);
    console.log('   Total count:', totalCount);

    // FIX 5: Filter by status if provided (in-memory filtering with null-safe check)
    let filteredStudents = students;
    if (status) {
      filteredStudents = students.filter(s => s.user?.status === status);
      console.log('   Filtered by status:', status, '->', filteredStudents.length, 'students');
    }

    // FIX 6: Calculate total pages safely (prevent division by zero)
    const total = status ? filteredStudents.length : totalCount;
    const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 0;

    // FIX 7: Ensure all students have safe default values for user relation
    // FIX 8: Ensure dates are serializable (convert to ISO strings)
    const safeStudents = filteredStudents.map(student => {
      // Prepare user object with safe defaults and serialized dates
      const user = student.user ? {
        status: student.user.status || 'ACTIVE',
        emailVerified: student.user.emailVerified || false,
        createdAt: student.user.createdAt 
          ? new Date(student.user.createdAt).toISOString() 
          : (student.createdAt ? new Date(student.createdAt).toISOString() : new Date().toISOString()),
      } : {
        status: 'ACTIVE',
        emailVerified: false,
        createdAt: student.createdAt 
          ? new Date(student.createdAt).toISOString() 
          : new Date().toISOString(),
      };

      // Return student with serialized dates and safe user
      return {
        ...student,
        user,
        createdAt: student.createdAt 
          ? new Date(student.createdAt).toISOString() 
          : new Date().toISOString(),
        updatedAt: student.updatedAt 
          ? new Date(student.updatedAt).toISOString() 
          : new Date().toISOString(),
      };
    });

    const response = {
      students: safeStudents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        totalPages: totalPages,
      },
    };

    console.log('✅ getAllStudents - Sending response');
    console.log('   Response students count:', response.students.length);
    console.log('   Pagination:', response.pagination);

    res.json(response);
  } catch (error) {
    // Detailed error logging
    console.error('========================================');
    console.error('Get all students error:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    if (error.stack) {
      console.error('Error stack:', error.stack.split('\n').slice(0, 15).join('\n'));
    }
    console.error('========================================');
    
    // Send detailed error in development, generic in production
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ 
      error: 'Failed to get students',
      message: isDev ? error.message : 'An error occurred while fetching students',
      ...(isDev && { 
        details: error.stack?.split('\n').slice(0, 5),
        code: error.code,
        meta: error.meta,
      }),
    });
  }
}

/**
 * Upload resume - supports multiple resumes
 * Replaces: resumeStorage.uploadResume()
 */
export async function uploadResume(req, res) {
  try {
    const userId = req.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Upload to S3
    const key = `resumes/${userId}/${Date.now()}-${file.originalname}`;
    let fileUrl;
    try {
      fileUrl = await uploadToS3(file.buffer, key, file.mimetype);
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      // Check for common S3 errors
      if (s3Error.name === 'CredentialsProviderError' || s3Error.message?.includes('credentials')) {
        return res.status(500).json({ 
          error: 'S3 configuration error: AWS credentials are missing or invalid. Please check server configuration.' 
        });
      }
      if (s3Error.name === 'NoSuchBucket' || s3Error.message?.includes('bucket')) {
        return res.status(500).json({ 
          error: 'S3 configuration error: Bucket not found. Please check S3_BUCKET_NAME configuration.' 
        });
      }
      return res.status(500).json({ 
        error: `Failed to upload to storage: ${s3Error.message || 'Unknown error'}` 
      });
    }

    // Save to StudentResumeFile model (supports multiple resumes)
    let resumeFile;
    try {
      resumeFile = await prisma.studentResumeFile.create({
        data: {
          studentId: student.id,
          userId: userId,
          fileUrl: fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          uploadedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ 
        error: `Failed to save resume record: ${dbError.message || 'Database error'}` 
      });
    }

    res.json({
      id: resumeFile.id,
      url: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: resumeFile.uploadedAt,
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ 
      error: `Failed to upload resume: ${error.message || 'Unknown error'}` 
    });
  }
}

/**
 * Get all resumes for a student
 */
export async function getResumes(req, res) {
  try {
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        resumeFiles: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student.resumeFiles || []);
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ error: 'Failed to get resumes' });
  }
}

/**
 * Upload profile image - Cloudinary
 * POST /api/students/profile-image
 * Auth: Student only
 */
export async function uploadProfileImage(req, res) {
  try {
    const userId = req.userId;
    const file = req.file; // From multer middleware

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if file was uploaded to Cloudinary (multer-storage-cloudinary)
    if (!file.path || !file.public_id) {
      return res.status(400).json({ error: 'File upload failed. Please try again.' });
    }

    const newImageUrl = file.secure_url || file.url;
    const newPublicId = file.public_id;

    // If existing profile image → delete old one from Cloudinary
    if (student.profileImagePublicId) {
      try {
        await deleteFromCloudinary(student.profileImagePublicId);
      } catch (deleteError) {
        console.error('Error deleting old profile image:', deleteError);
        // Continue even if deletion fails (non-critical)
      }
    }

    // Update student record with new image
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        profileImageUrl: newImageUrl,
        profileImagePublicId: newPublicId,
      },
    });

    res.json({
      message: 'Profile image uploaded successfully',
      profileImage: {
        url: updatedStudent.profileImageUrl,
        publicId: updatedStudent.profileImagePublicId,
      },
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ 
      error: `Failed to upload profile image: ${error.message || 'Unknown error'}` 
    });
  }
}

/**
 * Upload resume - Cloudinary (supports multiple resumes)
 * POST /api/students/resume
 * Body: { title } (optional)
 * Auth: Student only
 */
export async function uploadResumeCloudinary(req, res) {
  try {
    const userId = req.userId;
    const file = req.file; // From multer middleware
    const { title } = req.body; // Optional title

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if file was uploaded to Cloudinary
    if (!file.path || !file.public_id) {
      return res.status(400).json({ error: 'File upload failed. Please try again.' });
    }

    const fileUrl = file.secure_url || file.url;
    const publicId = file.public_id;

    // Save to StudentResumeFile model (supports multiple resumes)
    // New resume → default = false unless it's the first resume
    const existingResumes = await prisma.studentResumeFile.count({
      where: { studentId: student.id },
    });

    const isDefault = existingResumes === 0; // First resume is default

    // If this is set as default, unset all others
    if (isDefault) {
      await prisma.studentResumeFile.updateMany({
        where: { studentId: student.id },
        data: { isDefault: false },
      });
    }

    const resumeFile = await prisma.studentResumeFile.create({
      data: {
        studentId: student.id,
        userId: userId,
        fileUrl: fileUrl,
        fileName: file.originalname || 'resume.pdf',
        fileSize: file.bytes || file.size || null,
        publicId: publicId,
        title: title || file.originalname || 'Resume',
        isDefault: isDefault,
        uploadedAt: new Date(),
      },
    });

    res.json({
      id: resumeFile.id,
      url: resumeFile.fileUrl,
      fileName: resumeFile.fileName,
      fileSize: resumeFile.fileSize,
      title: resumeFile.title,
      isDefault: resumeFile.isDefault,
      uploadedAt: resumeFile.uploadedAt,
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ 
      error: `Failed to upload resume: ${error.message || 'Unknown error'}` 
    });
  }
}

/**
 * Set default resume
 * PATCH /api/students/resume/:resumeId/default
 * Auth: Student only
 */
export async function setDefaultResume(req, res) {
  try {
    const userId = req.userId;
    const { resumeId } = req.params;

    // Verify the resume belongs to this student
    const resumeFile = await prisma.studentResumeFile.findFirst({
      where: {
        id: resumeId,
        userId: userId,
      },
      include: {
        student: true,
      },
    });

    if (!resumeFile) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Set all resumes isDefault = false
    await prisma.studentResumeFile.updateMany({
      where: { studentId: resumeFile.studentId },
      data: { isDefault: false },
    });

    // Set selected resume isDefault = true
    const updatedResume = await prisma.studentResumeFile.update({
      where: { id: resumeId },
      data: { isDefault: true },
    });

    res.json({
      message: 'Default resume updated successfully',
      resume: updatedResume,
    });
  } catch (error) {
    console.error('Set default resume error:', error);
    res.status(500).json({ error: 'Failed to set default resume' });
  }
}

/**
 * Delete resume - Cloudinary
 * DELETE /api/students/resume/:resumeId
 * Auth: Student only
 */
export async function deleteResume(req, res) {
  try {
    const userId = req.userId;
    const { resumeId } = req.params;

    // Verify the resume belongs to this student
    const resumeFile = await prisma.studentResumeFile.findFirst({
      where: {
        id: resumeId,
        userId: userId,
      },
      include: {
        student: true,
      },
    });

    if (!resumeFile) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const wasDefault = resumeFile.isDefault;
    const studentId = resumeFile.studentId;

    // Delete file from Cloudinary using publicId
    if (resumeFile.publicId) {
      try {
        await deleteFromCloudinary(resumeFile.publicId);
      } catch (deleteError) {
        console.error('Error deleting file from Cloudinary:', deleteError);
        // Continue with DB deletion even if Cloudinary deletion fails
      }
    }

    // Remove entry from DB
    await prisma.studentResumeFile.delete({
      where: { id: resumeId },
    });

    // If deleted resume was default → set latest resume as default
    if (wasDefault) {
      const latestResume = await prisma.studentResumeFile.findFirst({
        where: { studentId: studentId },
        orderBy: { uploadedAt: 'desc' },
      });

      if (latestResume) {
        await prisma.studentResumeFile.update({
          where: { id: latestResume.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
}

/**
 * Add education
 */
export async function addEducation(req, res) {
  try {
    const userId = req.userId;
    const educationData = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const education = await prisma.education.create({
      data: {
        studentId: student.id,
        ...educationData,
      },
    });

    res.status(201).json(education);
  } catch (error) {
    console.error('Add education error:', error);
    res.status(500).json({ error: 'Failed to add education' });
  }
}

/**
 * Update education
 */
export async function updateEducation(req, res) {
  try {
    const { educationId } = req.params;
    const userId = req.userId;
    const educationData = req.body;

    // Verify education belongs to student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const education = await prisma.education.findUnique({
      where: { id: educationId },
      select: { studentId: true },
    });

    if (!education || education.studentId !== student.id) {
      return res.status(403).json({ error: 'Education not found or access denied' });
    }

    const updated = await prisma.education.update({
      where: { id: educationId },
      data: educationData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({ error: 'Failed to update education' });
  }
}

/**
 * Delete education
 */
export async function deleteEducation(req, res) {
  try {
    const { educationId } = req.params;
    const userId = req.userId;

    // Verify education belongs to student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const education = await prisma.education.findUnique({
      where: { id: educationId },
      select: { studentId: true },
    });

    if (!education || education.studentId !== student.id) {
      return res.status(403).json({ error: 'Education not found or access denied' });
    }

    await prisma.education.delete({
      where: { id: educationId },
    });

    res.json({ message: 'Education deleted' });
  } catch (error) {
    console.error('Delete education error:', error);
    res.status(500).json({ error: 'Failed to delete education' });
  }
}

/**
 * Add experience (for Resume System)
 */
export async function addExperience(req, res) {
  try {
    const userId = req.userId;
    const experienceData = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const experience = await prisma.experience.create({
      data: {
        studentId: student.id,
        ...experienceData,
      },
    });

    res.status(201).json(experience);
  } catch (error) {
    console.error('Add experience error:', error);
    res.status(500).json({ error: 'Failed to add experience' });
  }
}

/**
 * Update experience (for Resume System)
 */
export async function updateExperience(req, res) {
  try {
    const { experienceId } = req.params;
    const userId = req.userId;
    const experienceData = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
      select: { studentId: true },
    });

    if (!experience || experience.studentId !== student.id) {
      return res.status(403).json({ error: 'Experience not found or access denied' });
    }

    const updated = await prisma.experience.update({
      where: { id: experienceId },
      data: experienceData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({ error: 'Failed to update experience' });
  }
}

/**
 * Delete experience (for Resume System)
 */
export async function deleteExperience(req, res) {
  try {
    const { experienceId } = req.params;
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
      select: { studentId: true },
    });

    if (!experience || experience.studentId !== student.id) {
      return res.status(403).json({ error: 'Experience not found or access denied' });
    }

    await prisma.experience.delete({
      where: { id: experienceId },
    });

    res.json({ message: 'Experience deleted' });
  } catch (error) {
    console.error('Delete experience error:', error);
    res.status(500).json({ error: 'Failed to delete experience' });
  }
}

/**
 * Add project
 */
export async function addProject(req, res) {
  try {
    const userId = req.userId;
    const projectData = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const project = await prisma.project.create({
      data: {
        studentId: student.id,
        ...projectData,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Add project error:', error);
    res.status(500).json({ error: 'Failed to add project' });
  }
}

/**
 * Update project
 */
export async function updateProject(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const projectData = req.body;

    // Verify project belongs to student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { studentId: true },
    });

    if (!project || project.studentId !== student.id) {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: projectData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
}

/**
 * Delete project
 */
export async function deleteProject(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    // Verify project belongs to student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { studentId: true },
    });

    if (!project || project.studentId !== student.id) {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}

/**
 * Add achievement
 */
export async function addAchievement(req, res) {
  try {
    const userId = req.userId;
    const achievementData = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const achievement = await prisma.achievement.create({
      data: {
        studentId: student.id,
        ...achievementData,
      },
    });

    res.status(201).json(achievement);
  } catch (error) {
    console.error('Add achievement error:', error);
    res.status(500).json({ error: 'Failed to add achievement' });
  }
}

/**
 * Update achievement
 */
export async function updateAchievement(req, res) {
  try {
    const { achievementId } = req.params;
    const userId = req.userId;
    const achievementData = req.body;

    // Verify achievement belongs to student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { studentId: true },
    });

    if (!achievement || achievement.studentId !== student.id) {
      return res.status(403).json({ error: 'Achievement not found or access denied' });
    }

    const updated = await prisma.achievement.update({
      where: { id: achievementId },
      data: achievementData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
}

/**
 * Delete achievement
 */
export async function deleteAchievement(req, res) {
  try {
    const { achievementId } = req.params;
    const userId = req.userId;

    // Verify achievement belongs to student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { studentId: true },
    });

    if (!achievement || achievement.studentId !== student.id) {
      return res.status(403).json({ error: 'Achievement not found or access denied' });
    }

    await prisma.achievement.delete({
      where: { id: achievementId },
    });

    res.json({ message: 'Achievement deleted' });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
}

/**
 * Generate AI project content (for Resume System)
 * POST /api/students/generate-project-content
 */
export async function generateProjectContentEndpoint(req, res) {
  try {
    const userId = req.userId;
    const { title, description, techStack, projectId } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Generate AI content
    const aiContent = await generateProjectContent({
      title,
      description,
      techStack: techStack || [],
    });

    // If projectId is provided, update the project with AI content
    if (projectId) {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Verify project belongs to student
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { studentId: true },
      });

      if (!project || project.studentId !== student.id) {
        return res.status(403).json({ error: 'Project not found or access denied' });
      }

      // Update project with AI content
      await prisma.project.update({
        where: { id: projectId },
        data: {
          ai_summary: aiContent.summary,
          ai_bullets: JSON.stringify(aiContent.bullets),
          skills_extracted: JSON.stringify(aiContent.skills),
        },
      });
    }

    res.json(aiContent);
  } catch (error) {
    console.error('Generate project content error:', error);
    res.status(500).json({ 
      error: 'Failed to generate project content',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Helper: Sync coding profiles
 */
async function syncCodingProfiles(userId, profileData) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!student) return;

  const profiles = [
    { platform: 'linkedin', url: profileData.linkedin },
    { platform: 'github', url: profileData.githubUrl },
    { platform: 'youtube', url: profileData.youtubeUrl },
    { platform: 'leetcode', url: profileData.leetcode },
    { platform: 'codeforces', url: profileData.codeforces },
    { platform: 'geeksforgeeks', url: profileData.gfg },
    { platform: 'hackerrank', url: profileData.hackerrank },
  ];

  for (const { platform, url } of profiles) {
    if (url && url.trim()) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        let username = '';

        switch (platform) {
          case 'github':
            username = pathname.split('/')[1] || '';
            break;
          case 'linkedin':
            username = pathname.split('/in/')[1] || pathname.split('/')[1] || '';
            break;
          default:
            username = pathname.split('/').pop() || '';
        }

        await prisma.codingProfile.upsert({
          where: {
            studentId_platform: {
              studentId: student.id,
              platform,
            },
          },
          update: {
            profileUrl: url,
            username: username.replace('/', ''),
          },
          create: {
            studentId: student.id,
            platform,
            profileUrl: url,
            username: username.replace('/', ''),
          },
        });
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
}
