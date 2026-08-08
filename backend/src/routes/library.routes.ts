import { Router } from 'express';
import {
  listBooks, getBook, createBook, updateBook, deleteBook,
  listLoans, issueBook, returnBook, getLibraryStats,
} from '../controllers/library.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/stats', getLibraryStats);
router.get('/books', paginationMiddleware, listBooks);
router.get('/books/:id', getBook);
router.post('/books', isAdmin, createBook);
router.patch('/books/:id', isAdmin, updateBook);
router.delete('/books/:id', isAdmin, deleteBook);
router.get('/loans', paginationMiddleware, listLoans);
router.post('/loans', isAdmin, issueBook);
router.patch('/loans/:id/return', isAdmin, returnBook);

export default router;
