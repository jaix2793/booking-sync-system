import { Router } from 'express';
import { getAllBookings, getBookingById } from '../controllers/bookings';

const router = Router();

router.get('/', getAllBookings);
router.get('/:id', getBookingById);

export const bookingsRouter = router;