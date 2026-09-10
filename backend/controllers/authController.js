import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"
import Invitation from "../models/Invitation.js"
import { createAndSendNotification } from "../utils/notificationService.js"

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" })
    }

    const normalizedEmail = email.trim();
    const existingUser = await User.findOne({ email: normalizedEmail })

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    })

    // Check for pending workspace invitations and notify new user
    try {
      const pendingInvites = await Invitation.find({ email: normalizedEmail, status: "PENDING" }).populate("workspaceId", "name");
      for (const inv of pendingInvites) {
        await createAndSendNotification(null, {
          recipientId: newUser._id,
          actorId: inv.invitedBy,
          type: "WORKSPACE_INVITED",
          title: `Invited to ${inv.workspaceId?.name || "Workspace"}`,
          message: `You have a pending invitation to join ${inv.workspaceId?.name || "a workspace"}.`,
          workspaceId: inv.workspaceId?._id || inv.workspaceId,
        });
      }
    } catch (inviteErr) {
      console.error("Error creating pending invite notification on register:", inviteErr);
    }

    return res.status(201).json({ message: "User registered successfully" })
  } catch {
    return res.status(500).json({ message: "Server error" })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email: email.trim()})

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    )

    const memberships = await WorkspaceMembership.find({ userId: user._id }).populate("workspaceId")
    const workspaces = memberships
      .filter((m) => m.workspaceId)
      .map((m) => ({
        id: m.workspaceId._id,
        name: m.workspaceId.name,
        description: m.workspaceId.description,
        role: m.role,
      }))

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      workspaces,
    })
  } catch {
    return res.status(500).json({ message: "Server error" })
  }
}

const logout = (req, res) => {
  return res.json({ message: "Logout successful" })
}

export { register, login, logout }