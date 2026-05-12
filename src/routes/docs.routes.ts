import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import * as yaml from 'yamljs';
import * as path from 'path';

const router = Router();

const swaggerDocument = yaml.load(
  path.join(__dirname, '../../swagger.yaml')
);

router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Autocomplete Service API Docs',
}));

router.get('/docs', (_req, res) => {
  res.redirect('/api-docs');
});

router.get('/openapi.json', (_req, res) => {
  res.json(swaggerDocument);
});

export default router;
