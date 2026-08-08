import { Router } from 'express';
import {
  listAllPermissions,
  listRoles,
  updateRolePermissions,
  getUserGrants,
  grantUserPermission,
  revokeUserPermission,
  getPermissionOptions,
} from '../controllers/permission.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';

const router = Router();

router.use(requireAuth(), isAdmin);

router.get('/', listAllPermissions);
router.get('/roles', listRoles);
router.put('/roles/:role', updateRolePermissions);
router.get('/users/:id/grants', getUserGrants);
router.post('/users/:id/grants', grantUserPermission);
router.delete('/users/:id/grants/:permissionId', revokeUserPermission);
router.get('/options', getPermissionOptions);

export default router;
