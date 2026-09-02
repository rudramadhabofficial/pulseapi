import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all endpoints for user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const endpoints = await prisma.endpoint.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(endpoints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

// Create endpoint
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, url, method, expectedStatus, timeoutMs } = req.body;
    if (!name || !url) {
      res.status(400).json({ error: 'Name and URL are required' });
      return;
    }
    const endpoint = await prisma.endpoint.create({
      data: {
        userId: req.user!.userId,
        name,
        url,
        method: method || 'GET',
        expectedStatus: expectedStatus || 200,
        timeoutMs: timeoutMs || 5000,
        status: 'HEALTHY'
      }
    });
    res.json(endpoint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

// Get endpoint details with health checks and incidents
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const endpoint = await prisma.endpoint.findFirst({
      where: { id, userId: req.user!.userId },
      include: {
        healthChecks: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        incidents: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    res.json(endpoint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch endpoint details' });
  }
});

// Delete endpoint
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const endpoint = await prisma.endpoint.findFirst({
      where: { id, userId: req.user!.userId }
    });
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }

    await prisma.endpoint.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

export default router;
