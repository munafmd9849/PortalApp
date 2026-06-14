import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getTurnIceServers } from '../controllers/webrtc.js';

const router = express.Router();

router.get('/turn-ice-servers', authenticate, getTurnIceServers);

export default router;
