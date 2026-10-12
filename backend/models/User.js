import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "super_admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    resetOtp: {
      type: String,
      default: null,
    },
    resetOtpExpiry: {
      type: Date,
      default: null,
    },
    resetOtpAttempts: {
      type: Number,
      default: 0,
    },
    resetOtpLastAttemptDate: {
      type: Date,
      default: null,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorOtpHash: {
      type: String,
      default: null,
    },
    twoFactorOtpExpiry: {
      type: Date,
      default: null,
    },
    twoFactorAttempts: {
      type: Number,
      default: 0,
    },
    twoFactorLastSentAt: {
      type: Date,
      default: null,
    },
    twoFactorSendCount: {
      type: Number,
      default: 0,
    },
    twoFactorSetupOtpHash: {
      type: String,
      default: null,
    },
    twoFactorSetupOtpExpiry: {
      type: Date,
      default: null,
    },
    twoFactorSetupAttempts: {
      type: Number,
      default: 0,
    },
    twoFactorSetupLastSentAt: {
      type: Date,
      default: null,
    },
    twoFactorSetupSendCount: {
      type: Number,
      default: 0,
    },
    twoFactorDisableOtpHash: {
      type: String,
      default: null,
    },
    twoFactorDisableOtpExpiry: {
      type: Date,
      default: null,
    },
    twoFactorDisableAttempts: {
      type: Number,
      default: 0,
    },
    twoFactorDisableLastSentAt: {
      type: Date,
      default: null,
    },
    twoFactorDisableSendCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

const User = mongoose.model("User", userSchema)

export default User