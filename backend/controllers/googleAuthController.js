import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";
import { oauth2Client, getGoogleAuthUrl } from "../config/googleOAuth.js";
import { google } from "googleapis";


const oauthStates = new Map();

const oauthTransactions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [state, timestamp] of oauthStates.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      oauthStates.delete(state);
    }
  }

  
  for (const [code, data] of oauthTransactions.entries()) {
    if (now - data.timestamp > 60 * 1000) {
      oauthTransactions.delete(code);
    }
  }
}, 60 * 1000);

export const initiateGoogleOAuth = (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  oauthStates.set(state, Date.now());
  const authUrl = getGoogleAuthUrl(state);
  return res.redirect(authUrl);
};

export const googleOAuthCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error("Google OAuth Error from provider:", error);
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/oauth-success?error=access_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/oauth-success?error=missing_parameters`);
    }

    if (!oauthStates.has(state)) {
      console.error("Google OAuth Error: Invalid or expired state.");
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/oauth-success?error=invalid_state`);
    }
    oauthStates.delete(state); 

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfoResponse = await oauth2.userinfo.get();
    const userInfo = userInfoResponse.data;

    const { id: googleId, email, name, picture } = userInfo;
    
    if (!email) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/oauth-success?error=no_email`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        if (picture && !user.avatar) {
          user.avatar = picture;
        }
        await user.save();
      }
    } else {
      user = await User.create({
        username: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId,
        authProvider: "google",
        avatar: picture || "",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("worknestToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", 
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/app/dashboard`);

  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}?error=server_error`);
  }
};

export const exchangeAuthCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !oauthTransactions.has(code)) {
      return res.status(401).json({ message: "Invalid or expired authorization code" });
    }

    // Retrieve userId and delete the code instantly (One-Time Use)
    const { userId } = oauthTransactions.get(code);
    oauthTransactions.delete(code);

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const memberships = await WorkspaceMembership.find({ userId: user._id }).populate("workspaceId");
    const workspaces = memberships
      .filter((m) => m.workspaceId)
      .map((m) => ({
        id: m.workspaceId._id,
        name: m.workspaceId.name,
        description: m.workspaceId.description,
        role: m.role,
      }));

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      workspaces,
    });
  } catch (err) {
    console.error("Token exchange failed:", err);
    return res.status(500).json({ message: "Server error during token exchange" });
  }
};
