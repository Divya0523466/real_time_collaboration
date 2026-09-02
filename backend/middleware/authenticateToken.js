import jwt from "jsonwebtoken"

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "Access token required" })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" })
      }
      req.userId = decoded.userId
      next()
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

export default authenticateToken
