import { Router } from 'express';
import * as apiController from '../controllers/api.controller';

const router = Router();

router.get('/whatsapp-status', apiController.getWhatsAppStatus);
router.get('/chats', apiController.getChats);

router.get('/settings', apiController.getSettings);
router.post('/settings', apiController.updateSettings);

router.get('/monitored-chats', apiController.getMonitoredChats);
router.post('/monitored-chats', apiController.updateMonitoredChats);

router.get('/matches', apiController.getMatches);
router.delete('/matches', apiController.clearMatches);
router.delete('/matches/:id', apiController.deleteMatch);
router.post('/matches/:id/forward', apiController.forwardMatch);

router.post('/test-filter', apiController.testFilter);

export default router;
