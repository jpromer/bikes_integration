import { Router, Express, Request, Response } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: { title: 'Bikes API', version: '1.0.0' },
  },
  apis: ['./src/routes/*.{ts,js}'],
};

const swaggerSpec = swaggerJSDoc(options);

const router: Router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec));

export default router;
