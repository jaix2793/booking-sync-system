import { Router } from 'express';
import { getAllBookings, getBookingById, getStats } from '../controllers/bookings';

const router = Router();

router.get('/stats', getStats);
router.get('/', getAllBookings);
router.get('/:id', getBookingById);

export const bookingsRouter = router;