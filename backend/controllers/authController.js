import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";
import Invitation from "../models/Invitation.js";
import { createAndSendNotification } from "../utils/notificationService.js";
import { sendEmail } from "../utils/sendMail.js";
import {
  htmlTemplateOtp,
  htmlTemplateWelcome,
  htmlTemplate2FAOtp,
} from "../utils/templates.js";

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });
    }

    const enteredEmail = email.trim();
    const existingUser = await User.findOne({ email: enteredEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: username.trim(),
      email: enteredEmail,
      password: hashedPassword,
    });

    const htmlTemplate = htmlTemplateWelcome(username);

    await sendEmail(
      enteredEmail,
      "Welcome to WorkNest - Your Collaboration Hub",
      htmlTemplate,
    );

    try {
      const pendingInvites = await Invitation.find({
        email: enteredEmail,
        status: "PENDING",
      }).populate("workspaceId", "name");
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

    return res.status(201).json({ message: "User registered successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const generateOTP = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

const getOtpHash = (userId, otp) => {
  const secret =
    process.env.TWO_FACTOR_HMAC_SECRET ||
    process.env.JWT_SECRET ||
    "worknest-default-hmac-key";
  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${otp}`)
    .digest("hex");
};

const maskEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return "your registered email";
  }
  const [usernamePart, domain] = email.split("@");
  if (usernamePart.length <= 2) {
    return `${usernamePart.charAt(0)}*@${domain}`;
  }
  return `${usernamePart.charAt(0)}${"*".repeat(Math.max(1, usernamePart.length - 2))}${usernamePart.slice(-1)}@${domain}`;
};

const issueAuthSession = async (res, user) => {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  const memberships = await WorkspaceMembership.find({
    userId: user._id,
  }).populate("workspaceId");
  const workspaces = memberships
    .filter((m) => m.workspaceId)
    .map((m) => ({
      id: m.workspaceId._id,
      name: m.workspaceId.name,
      description: m.workspaceId.description,
      role: m.role,
    }));

  const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.FRONTEND_URL &&
      !process.env.FRONTEND_URL.includes("localhost"));

  res.cookie("worknestToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  const isSuperAdmin =
    user.role === "super_admin" ||
    user.role === "admin" ||
    user.email?.toLowerCase() === "admin@gmail.com";

  return res.json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: isSuperAdmin ? "admin" : user.role || "user",
      platformRole: isSuperAdmin ? "super_admin" : "user",
      isSuperAdmin,
      isActive: user.isActive !== false,
      status: user.status || "active",
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    },
    workspaces,
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim() });

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isActive === false || user.status === "inactive") {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact the administrator.",
      });
    }

    if (
      user.email?.toLowerCase() === "admin@gmail.com" &&
      user.role !== "super_admin"
    ) {
      user.role = "super_admin";
      await user.save().catch(() => {});
    }

    if (user.twoFactorEnabled) {
      const otp = generateOTP();
      const otpHash = getOtpHash(user._id, otp);

      user.twoFactorOtpHash = otpHash;
      user.twoFactorOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      user.twoFactorAttempts = 0;
      user.twoFactorLastSentAt = new Date();
      user.twoFactorSendCount = 1;
      await user.save();

      try {
        const html = htmlTemplate2FAOtp(otp, "login");
        await sendEmail(
          user.email,
          "Your WorkNest Login Verification Code",
          html,
        );
      } catch (emailErr) {
        console.error("Failed to send 2FA email:", emailErr);
      }

      const tempToken = jwt.sign(
        { userId: user._id, purpose: "2fa_pending" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" },
      );

      return res.status(200).json({
        requires2FA: true,
        tempToken,
        maskedEmail: maskEmail(user.email),
        message: "A verification code has been sent to your email.",
      });
    }

    return await issueAuthSession(res, user);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { tempToken, otp } = req.body;

    if (!tempToken || !otp) {
      return res
        .status(400)
        .json({ message: "Verification token and code are required." });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res
        .status(400)
        .json({ message: "Verification code must be 6 digits." });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        message: "Verification session has expired. Please log in again.",
        sessionExpired: true,
      });
    }

    if (!decoded || decoded.purpose !== "2fa_pending" || !decoded.userId) {
      return res.status(401).json({ message: "Invalid verification session." });
    }

    const expectedHash = getOtpHash(decoded.userId, cleanOtp);

    const consumedUser = await User.findOneAndUpdate(
      {
        _id: decoded.userId,
        twoFactorEnabled: true,
        twoFactorOtpHash: expectedHash,
        twoFactorOtpExpiry: { $gt: new Date() },
        twoFactorAttempts: { $lt: 5 },
      },
      {
        $set: {
          twoFactorOtpHash: null,
          twoFactorOtpExpiry: null,
          twoFactorAttempts: 0,
          twoFactorSendCount: 0,
        },
      },
      { new: true },
    );

    if (consumedUser) {
      return await issueAuthSession(res, consumedUser);
    }
    const existingUser = await User.findById(decoded.userId);
    if (!existingUser || !existingUser.twoFactorEnabled) {
      return res.status(400).json({
        message: "Invalid verification session. Please sign in again.",
      });
    }

    if (existingUser.twoFactorAttempts >= 5) {
      return res.status(400).json({
        message:
          "Maximum verification attempts exceeded. Challenge has been invalidated. Please sign in again.",
        challengeExhausted: true,
      });
    }

    if (
      !existingUser.twoFactorOtpExpiry ||
      existingUser.twoFactorOtpExpiry < new Date()
    ) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new code.",
        expired: true,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      { $inc: { twoFactorAttempts: 1 } },
      { new: true },
    );

    const remainingAttempts = Math.max(
      0,
      5 - (updatedUser?.twoFactorAttempts || 0),
    );
    if (remainingAttempts === 0) {
      await User.findByIdAndUpdate(decoded.userId, {
        $set: {
          twoFactorOtpHash: null,
          twoFactorOtpExpiry: null,
        },
      });
      return res.status(400).json({
        message:
          "Maximum verification attempts exceeded. Challenge has been invalidated. Please sign in again.",
        challengeExhausted: true,
      });
    }

    return res.status(400).json({
      message: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
      remainingAttempts,
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Server error during two-factor verification" });
  }
};

const resend2FA = async (req, res) => {
  try {
    const { tempToken } = req.body;

    if (!tempToken) {
      return res
        .status(400)
        .json({ message: "Verification token is required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        message: "Verification session has expired. Please log in again.",
        sessionExpired: true,
      });
    }

    if (!decoded || decoded.purpose !== "2fa_pending" || !decoded.userId) {
      return res.status(401).json({ message: "Invalid verification session." });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: "Invalid verification session." });
    }

    if (user.twoFactorLastSentAt) {
      const elapsedMs =
        Date.now() - new Date(user.twoFactorLastSentAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSeconds = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting a new code.`,
          cooldownRemaining: remainingSeconds,
        });
      }
    }

    if ((user.twoFactorSendCount || 0) >= 5) {
      return res.status(429).json({
        message:
          "Maximum code requests reached for this session. Please sign in again.",
        limitReached: true,
      });
    }

    const newOtp = generateOTP();
    const newHash = getOtpHash(user._id, newOtp);

    user.twoFactorOtpHash = newHash;
    user.twoFactorOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.twoFactorAttempts = 0;
    user.twoFactorLastSentAt = new Date();
    user.twoFactorSendCount = (user.twoFactorSendCount || 0) + 1;
    await user.save();

    try {
      const html = htmlTemplate2FAOtp(newOtp, "login");
      await sendEmail(
        user.email,
        "Your WorkNest Login Verification Code",
        html,
      );
    } catch (emailErr) {
      console.error("Failed to send 2FA resend email:", emailErr);
    }

    return res.status(200).json({
      message: "A new verification code has been sent to your email.",
      maskedEmail: maskEmail(user.email),
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Server error resending verification code" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.resetOtpLastAttemptDate && user.resetOtpLastAttemptDate >= today) {
      if (user.resetOtpAttempts >= 3) {
        return res
          .status(429)
          .json({ message: "Too many attempts. Please try again tomorrow." });
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

    const htmlTemplate = htmlTemplateOtp(otp);
    await sendEmail(
      user.email,
      "Password Reset OTP - WorkNest",
      `Your OTP for password reset is ${otp}. It is valid for 10 minutes.`,
      htmlTemplate,
    );

    return res.status(200).json({ message: "OTP sent to email" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
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

    return res.status(200).json({ message: "OTP Verified Successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP and new password are required" });
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
};

const logout = (req, res) => {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.FRONTEND_URL &&
      !process.env.FRONTEND_URL.includes("localhost"));
  res.clearCookie("worknestToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  return res.json({ message: "Logout successful" });
};

const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const userId = req.userId;

    const updates = {};
    if (username !== undefined) {
      const trimmed = typeof username === "string" ? username.trim() : "";
      if (!trimmed || trimmed.length < 2) {
        return res
          .status(400)
          .json({ message: "Username must be at least 2 characters long" });
      }
      updates.username = trimmed;
    }

    if (avatar !== undefined) {
      updates.avatar = typeof avatar === "string" ? avatar.trim() : "";
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        twoFactorEnabled: Boolean(updatedUser.twoFactorEnabled),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update profile", error: error.message });
  }
};

const send2FASetupOtp = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        message:
          "Two-factor authentication is already enabled for your account.",
      });
    }

    if (user.twoFactorSetupLastSentAt) {
      const elapsedMs =
        Date.now() - new Date(user.twoFactorSetupLastSentAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSeconds = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting a new code.`,
          cooldownRemaining: remainingSeconds,
        });
      }
    }

    if ((user.twoFactorSetupSendCount || 0) >= 5) {
      return res.status(429).json({
        message:
          "Maximum setup attempts reached for today. Please try again later.",
      });
    }

    const otp = generateOTP();
    const hash = getOtpHash(user._id, otp);

    user.twoFactorSetupOtpHash = hash;
    user.twoFactorSetupOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.twoFactorSetupAttempts = 0;
    user.twoFactorSetupLastSentAt = new Date();
    user.twoFactorSetupSendCount = (user.twoFactorSetupSendCount || 0) + 1;
    await user.save();

    try {
      const html = htmlTemplate2FAOtp(otp, "setup");
      await sendEmail(
        user.email,
        "WorkNest - 2FA Setup Verification Code",
        html,
      );
    } catch (emailErr) {
      console.error("Failed to send 2FA setup email:", emailErr);
    }

    return res.status(200).json({
      message: "Setup verification code sent to your email.",
      maskedEmail: maskEmail(user.email),
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Server error sending setup verification code" });
  }
};

const enable2FA = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(400)
        .json({ message: "Verification code is required." });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res
        .status(400)
        .json({ message: "Verification code must be 6 digits." });
    }

    const expectedHash = getOtpHash(req.userId, cleanOtp);

    // Atomically find and consume setup OTP
    const user = await User.findOneAndUpdate(
      {
        _id: req.userId,
        twoFactorSetupOtpHash: expectedHash,
        twoFactorSetupOtpExpiry: { $gt: new Date() },
        twoFactorSetupAttempts: { $lt: 5 },
      },
      {
        $set: {
          twoFactorEnabled: true,
          twoFactorSetupOtpHash: null,
          twoFactorSetupOtpExpiry: null,
          twoFactorSetupAttempts: 0,
          twoFactorSetupSendCount: 0,
        },
      },
      { new: true },
    );

    if (user) {
      return res.status(200).json({
        message: "Two-factor authentication enabled successfully.",
        twoFactorEnabled: true,
      });
    }

    // Inspect why it failed
    const existingUser = await User.findById(req.userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (existingUser.twoFactorSetupAttempts >= 5) {
      return res.status(400).json({
        message: "Maximum setup attempts exceeded. Please request a new code.",
        challengeExhausted: true,
      });
    }

    if (
      !existingUser.twoFactorSetupOtpExpiry ||
      existingUser.twoFactorSetupOtpExpiry < new Date()
    ) {
      return res.status(400).json({
        message:
          "Setup verification code has expired. Please request a new code.",
        expired: true,
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { twoFactorSetupAttempts: 1 } },
      { new: true },
    );

    const remaining = Math.max(0, 5 - (updated?.twoFactorSetupAttempts || 0));
    if (remaining === 0) {
      await User.findByIdAndUpdate(req.userId, {
        $set: {
          twoFactorSetupOtpHash: null,
          twoFactorSetupOtpExpiry: null,
        },
      });
      return res.status(400).json({
        message:
          "Maximum setup attempts exceeded. Challenge has been invalidated. Please request a new code.",
        challengeExhausted: true,
      });
    }

    return res.status(400).json({
      message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      remainingAttempts: remaining,
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Server error enabling two-factor authentication" });
  }
};

const send2FADisableOtp = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        message: "Two-factor authentication is not enabled for your account.",
      });
    }

    if (user.twoFactorDisableLastSentAt) {
      const elapsedMs =
        Date.now() - new Date(user.twoFactorDisableLastSentAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSeconds = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting a new code.`,
          cooldownRemaining: remainingSeconds,
        });
      }
    }

    if ((user.twoFactorDisableSendCount || 0) >= 5) {
      return res.status(429).json({
        message: "Maximum disable attempts reached for today. Please try again later.",
      });
    }

    const otp = generateOTP();
    const hash = getOtpHash(user._id, otp);

    user.twoFactorDisableOtpHash = hash;
    user.twoFactorDisableOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.twoFactorDisableAttempts = 0;
    user.twoFactorDisableLastSentAt = new Date();
    user.twoFactorDisableSendCount = (user.twoFactorDisableSendCount || 0) + 1;
    await user.save();

    try {
      const html = htmlTemplate2FAOtp(otp, "disable");
      await sendEmail(
        user.email,
        "WorkNest - 2FA Disable Verification Code",
        html,
      );
    } catch (emailErr) {
      console.error("Failed to send 2FA disable email:", emailErr);
    }

    return res.status(200).json({
      message: "Disable verification code sent to your email.",
      maskedEmail: maskEmail(user.email),
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Server error sending disable verification code" });
  }
};

const disable2FA = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(400)
        .json({ message: "Verification code is required to disable two-factor authentication." });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res
        .status(400)
        .json({ message: "Verification code must be 6 digits." });
    }

    const expectedHash = getOtpHash(req.userId, cleanOtp);

    // Atomically find and consume disable OTP
    const user = await User.findOneAndUpdate(
      {
        _id: req.userId,
        twoFactorEnabled: true,
        twoFactorDisableOtpHash: expectedHash,
        twoFactorDisableOtpExpiry: { $gt: new Date() },
        twoFactorDisableAttempts: { $lt: 5 },
      },
      {
        $set: {
          twoFactorEnabled: false,
          twoFactorOtpHash: null,
          twoFactorOtpExpiry: null,
          twoFactorAttempts: 0,
          twoFactorSendCount: 0,
          twoFactorSetupOtpHash: null,
          twoFactorSetupOtpExpiry: null,
          twoFactorSetupAttempts: 0,
          twoFactorSetupSendCount: 0,
          twoFactorDisableOtpHash: null,
          twoFactorDisableOtpExpiry: null,
          twoFactorDisableAttempts: 0,
          twoFactorDisableSendCount: 0,
        },
      },
      { new: true },
    );

    if (user) {
      return res.status(200).json({
        message: "Two-factor authentication disabled successfully.",
        twoFactorEnabled: false,
      });
    }

    // Inspect why it failed
    const existingUser = await User.findById(req.userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!existingUser.twoFactorEnabled) {
      return res
        .status(400)
        .json({ message: "Two-factor authentication is not enabled." });
    }

    if (existingUser.twoFactorDisableAttempts >= 5) {
      return res.status(400).json({
        message: "Maximum disable attempts exceeded. Please request a new code.",
        challengeExhausted: true,
      });
    }

    if (
      !existingUser.twoFactorDisableOtpExpiry ||
      existingUser.twoFactorDisableOtpExpiry < new Date()
    ) {
      return res.status(400).json({
        message: "Disable verification code has expired. Please request a new code.",
        expired: true,
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { twoFactorDisableAttempts: 1 } },
      { new: true },
    );

    const remaining = Math.max(0, 5 - (updated?.twoFactorDisableAttempts || 0));
    if (remaining === 0) {
      await User.findByIdAndUpdate(req.userId, {
        $set: {
          twoFactorDisableOtpHash: null,
          twoFactorDisableOtpExpiry: null,
        },
      });
      return res.status(400).json({
        message:
          "Maximum disable attempts exceeded. Challenge has been invalidated. Please request a new code.",
        challengeExhausted: true,
      });
    }

    return res.status(400).json({
      message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      remainingAttempts: remaining,
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Server error disabling two-factor authentication" });
  }
};

const updatePresenceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "away", "offline"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Allowed values: active, away, offline" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: { presenceStatus: status } },
      { new: true }
    ).select("presenceStatus username email");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Status updated successfully",
      presenceStatus: updatedUser.presenceStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

export {
  register,
  login,
  verify2FA,
  resend2FA,
  send2FASetupOtp,
  enable2FA,
  send2FADisableOtp,
  disable2FA,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,
  updateProfile,
  updatePresenceStatus,
};
