import { Router } from 'express';
import { authenticateRider } from '../middleware/riderAuth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import {
  acceptRiderJob,
  acceptRiderRequestOffer,
  addRiderJobLocation,
  declineRiderRequestOffer,
  expireRiderRequestOffer,
  getActiveRiderJob,
  getAssignedRiderJobs,
  getAvailableRiderJobs,
  getRiderJobHistory,
  rejectRiderAssignedJob,
  submitRiderProof,
  updateRiderJobStatus,
} from '../controllers/riderJobs.controller.js';

const router = Router();

router.use(authenticateRider);

router.get('/available', getAvailableRiderJobs);
router.get('/active', getActiveRiderJob);
router.get('/assigned', getAssignedRiderJobs);
router.get('/history', getRiderJobHistory);
router.post('/request-offers/:offerId/accept', acceptRiderRequestOffer);
router.post('/request-offers/:offerId/decline', declineRiderRequestOffer);
router.post('/request-offers/:offerId/expire', expireRiderRequestOffer);
router.post('/:id/accept', acceptRiderJob);
router.post('/:id/reject', rejectRiderAssignedJob);
router.put('/:id/status', updateRiderJobStatus);
router.post('/:id/location', addRiderJobLocation);
router.post('/:id/proof', upload.any(), submitRiderProof);

export default router;
