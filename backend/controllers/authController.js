import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"
import Invitation from "../models/Invitation.js"
import { createAndSendNotification } from "../utils/notificationService.js"
import { sendEmail } from "../utils/sendMail.js";
import {htmlTemplateOtp,htmlTemplateWelcome} from "../utils/templates.js"

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" })
    }

    const enteredEmail = email.trim();
    const existingUser = await User.findOne({ email: enteredEmail })

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await User.create({
      username: username.trim(),
      email: enteredEmail,
      password: hashedPassword,
    });

   const htmlTemplate=htmlTemplateWelcome(username);

    await sendEmail(
      enteredEmail, 
      "Welcome to WorkNest - Your Collaboration Hub",
      htmlTemplate
    );

    
    try {
      const pendingInvites = await Invitation.find({ email: enteredEmail, status: "PENDING" }).populate("workspaceId", "name");
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
    } catch {
      // Registration should succeed even if the optional invitation notification fails.
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

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
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

    res.cookie("worknestToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    return res.json({
      message: "Login successful",
      token, // Kept for backward compatibility during transition
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



const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }

    const user = await User.findOne({ email: email.trim()})

    if (!user) {
      return res.status(401).json({ message: "Invalid email" })
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.resetOtpLastAttemptDate && user.resetOtpLastAttemptDate >= today) {
      if (user.resetOtpAttempts >= 3) {
        return res.status(429).json({ message: "Too many attempts. Please try again tomorrow." });
      }
      user.resetOtpAttempts += 1;
    } else {
      user.resetOtpAttempts = 1;
    }
    user.resetOtpLastAttemptDate = new Date();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const htmlTemplate=htmlTemplateOtp(otp);
    await sendEmail(
      user.email, 
      "Password Reset OTP - WorkNest", 
      `Your OTP for password reset is ${otp}. It is valid for 10 minutes.`,
      htmlTemplate
    );

    return res.status(200).json({message: "OTP sent to email"});
  } catch {
    return res.status(500).json({ message: "Server error" })
  }
}

const verifyOTP=async(req,res)=>{
   try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" })
    }
    const user = await User.findOne({ email: email.trim() })
    if (!user) {
      return res.status(401).json({ message: "Invalid email" })
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" })
    }

    if (new Date() > user.resetOtpExpiry) {
      return res.status(401).json({ message: "OTP has expired" })
    }

    return res.status(200).json({message: "OTP Verified Successfully"});
  } catch {
    return res.status(500).json({ message: "Server error" })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
       return res.status(400).json({ message: "Email, OTP and new password are required" });
    }

    const user = await User.findOne({ email: email.trim() });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.resetOtpExpiry) {
      return res.status(401).json({ message: "OTP has expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

const logout = (req, res) => {
  res.clearCookie("worknestToken");
  return res.json({ message: "Logout successful" })
}

export { register, login, logout, forgotPassword, verifyOTP, resetPassword }