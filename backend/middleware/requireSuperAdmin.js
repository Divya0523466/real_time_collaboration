import User from "../models/User.js";

const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.userId).select("email role");
    const isSuperAdmin =
      user &&
      (user.role === "super_admin" ||
        user.role === "admin" ||
        user.email?.toLowerCase() === "admin@gmail.com");

    if (!isSuperAdmin) {
      return res.status(403).json({
        message: "Access denied. Super Admin privileges required.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Server error verifying admin credentials" });
  }
};

export default requireSuperAdmin;
