import { Request, Response } from 'express';
import { findAllBookings, findBookingById } from '../services/bookings';

export const getAllBookings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = Math.max(
      parseInt(String(req.query.page ?? '1'), 10),
      1
    );

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? '10'), 10), 1),
      100
    );

    const data = await findAllBookings({
      status:
        typeof req.query.status === 'string'
          ? req.query.status
          : undefined,

      check_in_from:
        typeof req.query.check_in_from === 'string'
          ? req.query.check_in_from
          : undefined,

      check_in_to:
        typeof req.query.check_in_to === 'string'
          ? req.query.check_in_to
          : undefined,

      page,
      limit,
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getBookingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await findBookingById(req.params.id);

    if (!data) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};