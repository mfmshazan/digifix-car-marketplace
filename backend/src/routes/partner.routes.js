import { Router } from 'express';
import { 
    getPartnerProfile, 
    updatePartnerStatus, 
    updatePartnerLocation 
} from '../controllers/partner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Protected routes (Only accessible by authenticated users)
router.get('/profile', authenticate, getPartnerProfile);
router.put('/profile', authenticate, getPartnerProfile); // Placeholder for update
router.put('/status', authenticate, updatePartnerStatus);
router.put('/location', authenticate, updatePartnerLocation);

export default router;
