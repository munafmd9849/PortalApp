import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Academic Structure Controller
 * Manages dynamic schools (branches), centers (campuses), and batches
 */

// Schools (Branches) CRUD
export const getSchools = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const schools = await prisma.school.findMany({
      where: includeInactive ? {} : { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });
    res.json(schools);
  } catch (error) {
    logger.error('getSchools error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

export const createSchool = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const existing = await prisma.school.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: 'School name already exists' });

    const school = await prisma.school.create({
      data: { 
        name, 
        code: code || null, 
        status: 'ACTIVE' 
      }
    });
    res.status(201).json(school);
  } catch (error) {
    logger.error('createSchool error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
};

export const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, status } = req.body;
    
    const school = await prisma.school.update({
      where: { id },
      data: { 
        name, 
        code: code !== undefined ? code : undefined, 
        status 
      }
    });
    res.json(school);
  } catch (error) {
    logger.error('updateSchool error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
};

export const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if any student is using this school
    const studentCount = await prisma.student.count({ where: { schoolId: id } });
    if (studentCount > 0) {
      return res.status(400).json({ error: 'Cannot delete school: It is assigned to existing students' });
    }
    await prisma.school.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('deleteSchool error:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
};

// Centers (Campuses) CRUD
export const getCenters = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const centers = await prisma.center.findMany({
      where: includeInactive ? {} : { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });
    res.json(centers);
  } catch (error) {
    logger.error('getCenters error:', error);
    res.status(500).json({ error: 'Failed to fetch centers' });
  }
};

export const createCenter = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const existing = await prisma.center.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Center name already exists' });

    const center = await prisma.center.create({
      data: { 
        name, 
        location: location || null, 
        status: 'ACTIVE' 
      }
    });
    res.status(201).json(center);
  } catch (error) {
    logger.error('createCenter error:', error);
    res.status(500).json({ error: 'Failed to create center' });
  }
};

export const updateCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, status } = req.body;
    
    const center = await prisma.center.update({
      where: { id },
      data: { 
        name, 
        location: location !== undefined ? location : undefined, 
        status 
      }
    });
    res.json(center);
  } catch (error) {
    logger.error('updateCenter error:', error);
    res.status(500).json({ error: 'Failed to update center' });
  }
};

export const deleteCenter = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if any student is using this center
    const studentCount = await prisma.student.count({ where: { centerId: id } });
    if (studentCount > 0) {
      return res.status(400).json({ error: 'Cannot delete center: It is assigned to existing students' });
    }
    await prisma.center.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('deleteCenter error:', error);
    res.status(500).json({ error: 'Failed to delete center' });
  }
};

// Batches CRUD
export const getBatches = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const batches = await prisma.batch.findMany({
      where: includeInactive ? {} : { status: 'ACTIVE' },
      orderBy: { year: 'desc' }
    });
    res.json(batches);
  } catch (error) {
    logger.error('getBatches error:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
};

export const createBatch = async (req, res) => {
  try {
    const { year, label } = req.body;
    if (!year) return res.status(400).json({ error: 'Year is required' });
    
    const existing = await prisma.batch.findUnique({ where: { year } });
    if (existing) return res.status(400).json({ error: 'Batch year already exists' });

    const batch = await prisma.batch.create({
      data: { 
        year, 
        label: label || null, 
        status: 'ACTIVE' 
      }
    });
    res.status(201).json(batch);
  } catch (error) {
    logger.error('createBatch error:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
};

export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, label, status } = req.body;
    
    const batch = await prisma.batch.update({
      where: { id },
      data: { 
        year, 
        label: label !== undefined ? label : undefined, 
        status 
      }
    });
    res.json(batch);
  } catch (error) {
    logger.error('updateBatch error:', error);
    res.status(500).json({ error: 'Failed to update batch' });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if any student is using this batch
    const studentCount = await prisma.student.count({ where: { batchId: id } });
    if (studentCount > 0) {
      return res.status(400).json({ error: 'Cannot delete batch: It is assigned to existing students' });
    }
    await prisma.batch.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('deleteBatch error:', error);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
};
