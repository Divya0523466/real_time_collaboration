import mongoose from "mongoose"

const inviteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED"],
      default: "PENDING",
    },
    role: {
      type: String,
      enum: ["ADMIN", "MEMBER"],
      default: "MEMBER",
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
)

inviteSchema.index({ workspaceId: 1, email: 1 }, { unique: true })

const Invitation = mongoose.model("Invitation", inviteSchema)

export default Invitation
