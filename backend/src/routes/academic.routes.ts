import { Router } from 'express';
import {
  createAcademicYear,
  listAcademicYears,
  getAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  activateAcademicYear,
  createTerm,
  listTerms,
  getTerm,
  updateTerm,
  deleteTerm,
  createClass,
  listClasses,
  getClass,
  updateClass,
  deleteClass,
  createSubject,
  listSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  createEnrollment,
  listEnrollments,
  deleteEnrollment,
  getClassStudents,
  assignTeacherToClass,
  getClassSubjects,
  assignSubjectsToClass,
} from '../controllers/academic.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

// Academic Years
router.get('/years', paginationMiddleware, listAcademicYears);
router.get('/years/:id', getAcademicYear);
router.post('/years', isAdmin, createAcademicYear);
router.patch('/years/:id', isAdmin, updateAcademicYear);
router.delete('/years/:id', isAdmin, deleteAcademicYear);
router.post('/years/:id/activate', isAdmin, activateAcademicYear);

// Terms
router.get('/terms', paginationMiddleware, listTerms);
router.get('/terms/:id', getTerm);
router.post('/terms', isAdmin, createTerm);
router.patch('/terms/:id', isAdmin, updateTerm);
router.delete('/terms/:id', isAdmin, deleteTerm);

// Classes
router.get('/classes', paginationMiddleware, listClasses);
router.get('/classes/:id', getClass);
router.get('/classes/:id/students', getClassStudents);
router.get('/classes/:id/subjects', getClassSubjects);
router.post('/classes', isAdmin, createClass);
router.patch('/classes/:id', isAdmin, updateClass);
router.delete('/classes/:id', isAdmin, deleteClass);
router.post('/classes/:id/subjects', isAdmin, assignSubjectsToClass);
router.post('/classes/:id/assign-teacher', isAdmin, assignTeacherToClass);

// Subjects
router.get('/subjects', paginationMiddleware, listSubjects);
router.get('/subjects/:id', getSubject);
router.post('/subjects', isAdmin, createSubject);
router.patch('/subjects/:id', isAdmin, updateSubject);
router.delete('/subjects/:id', isAdmin, deleteSubject);

// Enrollments
router.get('/enrollments', isAdmin, paginationMiddleware, listEnrollments);
router.post('/enrollments', isAdmin, createEnrollment);
router.delete('/enrollments/:id', isAdmin, deleteEnrollment);

export default router;