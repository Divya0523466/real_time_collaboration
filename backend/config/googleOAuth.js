import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";

export const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL
);

export const getGoogleAuthUrl = (state) => {
  const scopes = ["openid", "email", "profile"];
  
  return oauth2Client.generateAuthUrl({
    access_type: "online",
    scope: scopes,
    state: state, 
    prompt: "consent",
  });
};
