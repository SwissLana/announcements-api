import { Router } from 'express';
import { listAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcements.controller.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.ts';
import { announcementSchema, updateAnnouncementSchema, idSchema, querySchema } from '../validators/announcements.validator.ts';

const router = Router();
router.get('/', validateQuery(querySchema), listAnnouncements);
router.get('/:id', validateParams(idSchema), getAnnouncement);
router.post('/', authenticate, validateBody(announcementSchema), createAnnouncement);
router.patch('/:id', authenticate, validateParams(idSchema), validateBody(updateAnnouncementSchema), updateAnnouncement);
router.delete('/:id', authenticate, validateParams(idSchema), deleteAnnouncement);
export default router;
