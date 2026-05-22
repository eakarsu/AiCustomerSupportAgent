import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { refund_tickets: 31, escalation_risk: 8, saved_orders: 5, policy_exceptions: 3 },
    tickets: [
      { ticket: 'TCK-8821', order: 'ORD-4491', reason: 'late delivery', risk: 'high', action: 'manager refund exception' },
      { ticket: 'TCK-8840', order: 'ORD-4508', reason: 'damaged item', risk: 'medium', action: 'replacement offer' },
      { ticket: 'TCK-8877', order: 'ORD-4552', reason: 'wrong size', risk: 'low', action: 'self-serve return' },
    ],
  });
});

router.post('/predict', (req, res) => {
  const { sentiment = 'neutral', orderValue = 0 } = req.body || {};
  const risk = sentiment === 'angry' || orderValue > 500 ? 'high' : 'standard';
  res.json({ risk, action: risk === 'high' ? 'route to senior agent' : 'apply normal refund policy' });
});

export default router;
