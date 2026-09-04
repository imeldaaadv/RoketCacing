import jwt from 'jsonwebtoken';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

export function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

export function verifySocket(socket) {
  try {
    return jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}