import jwt from 'jsonwebtoken';

// JWT Authentication middleware
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
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
      // Continue if check fails
    }
  }
  next();
}
