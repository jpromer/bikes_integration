import { Router } from 'express';
import { body } from 'express-validator';

import {
  getBikeById,
  createBikeRoute,
  getAllBikes,
  deleteBikeRoute,
  updateBikeRoute,
} from '../controllers/bikes';

const router: Router = Router();

/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to swagger-jsdoc!
 *     responses:
 *       200:
 *         description: Returns a mysterious string.
 */
router.get('/', getAllBikes);

router.post(
  '/',
  body('bikeId').isString().not().isEmpty(),
  body('color').isString().not().isEmpty(),
  body('model').isString().not().isEmpty(),
  createBikeRoute
);

router.patch(
  '/:bid',
  body('color').isString().not().isEmpty(),
  body('model').isString().not().isEmpty(),
  updateBikeRoute
);

router.delete('/:bid', deleteBikeRoute);

router.get('/:bid', getBikeById);

export default router;
