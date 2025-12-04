const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function AuthMiddleware(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    else if (req.cookies && req.cookies.token) token = req.cookies.token;

    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id || decoded._id || decoded.userId;
    if (!id) return res.status(401).json({ message: 'Invalid token payload' });

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    console.error('Auth error:', err.message || err);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
