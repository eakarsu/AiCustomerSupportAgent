import jwt from 'jsonwebtoken';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

// JWT Authentication middleware
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.tenantId || !decoded.id) return res.status(403).json({ error: 'Token lacks tenant identity' });
    const user = await req.prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, role: true, tenantId: true, subjectId: true, isActive: true } });
    if (!user || !user.isActive || user.tenantId !== decoded.tenantId || (user.role === 'customer' && !user.subjectId)) return res.status(403).json({ error: 'Identity or tenant assignment mismatch' });
    req.user = { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, subjectId: user.subjectId };
    req.token = token;
    next();
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') return res.status(401).json({ error: 'Invalid or expired token' });
    return res.status(503).json({ error: 'Identity verification unavailable' });
  }
}

// RBAC Authorization middleware
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Check if token is blacklisted (for logout)
export async function checkBlacklist(req, res, next) {
  if (req.token) {
    try {
      const blacklisted = await req.prisma.blacklistedToken.findUnique({
        where: { token: req.token }
      });
      if (blacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    } catch (error) {
      return res.status(503).json({ error: 'Token revocation check unavailable' });
    }
  }
  next();
}
