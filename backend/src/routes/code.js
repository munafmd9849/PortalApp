import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { runCodeHandler, evaluateCodeHandler } from '../controllers/codeExecution.js';

const router = express.Router();

router.post('/run', authenticate, runCodeHandler);
router.post('/evaluate', authenticate, evaluateCodeHandler);

export default router;
