/**
 * Resume view routes (public by token - for opening in new tab)
 */

import express from 'express';
import * as resumeViewController from '../controllers/resumeView.js';

const router = express.Router();

// GET /api/resume/view?t=<jwt> - stream resume with Content-Disposition: inline
router.get('/view', resumeViewController.streamByToken);

export default router;
