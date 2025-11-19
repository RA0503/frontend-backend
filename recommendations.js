import express from 'express';
import { callGeminiAPI } from '../utils/mockGemini.js';

const router = express.Router();

router.post('/recommendations', async (req, res) => {
  try {

    
    const preferences = req.body || {};
    const response = await callGeminiAPI(preferences);
    return res.json(response);
  } catch (err) {
    console.error('Recommendations error', err);
    return res.status(500).json({ message: 'Failed to generate recommendations' });
  }
});

export default router;

