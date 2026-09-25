import jwt from "jsonwebtoken"

const authenticateToken = (req, res, next) => {
  try {
  
    const authHeader = req.headers.authorization;
    let headerToken = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const candidate = authHeader.split(" ")[1]?.trim();
      if (candidate && candidate !== "null" && candidate !== "undefined") {
        headerToken = candidate;
      }
    }
    const token = headerToken || req.cookies?.worknestToken;

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      req.userId = decoded.userId;
      req.token = token;
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export default authenticateToken;
