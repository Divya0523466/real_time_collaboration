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
    presenceStatus: {
      type: String,
      enum: ["active", "away", "offline"],
      default: "active",
    },
    blockedUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    bio: {
      type: String,
      maxlength: 250,
      default: "",
      trim: true,
    },
    customStatus: {
      text: {
        type: String,
        maxlength: 100,
        default: "",
        trim: true,
      },
      emoji: {
        type: String,
        default: "",
        trim: true,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    dndUntil: {
      type: Date,
      default: null,
    },
    subscription: {
      plan: {
        type: String,
        enum: ["FREE", "PRO"],
        default: "FREE",
      },
      status: {
        type: String,
        enum: ["none", "active", "canceling", "incomplete", "canceled", "past_due"],
        default: "active",
      },
      cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
      },
      stripeCustomerId: {
        type: String,
        default: null,
      },
      stripeSubscriptionId: {
        type: String,
        default: null,
      },
      currentPeriodEnd: {
        type: Date,
        default: null,
      },
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