import { Router } from 'express';
import * as mobileApplicationService from './mobile_application_service.js';
import { requireAuth, requireCompany } from '../../middleware/auth.js';

const router = Router();

router.get('/company-list', requireCompany, mobileApplicationService.listCompanyApplications);
router.get('/client-list',  requireAuth,    mobileApplicationService.listClientApplications);

export default router;
