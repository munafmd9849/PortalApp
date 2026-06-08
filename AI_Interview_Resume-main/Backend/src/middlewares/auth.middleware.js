const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

/**
 * Accepts JWT from either the `token` cookie or `Authorization: Bearer <token>` header.
 */
async function authUser(req, res, next) {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const blacklisted = await prisma.blacklistToken.findUnique({
      where: { token },
    });
    
    if (blacklisted) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error.message);
    res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { authUser };
