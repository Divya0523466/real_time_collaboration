import mongoose from "mongoose"

const ROLES = ["OWNER", "ADMIN", "MEMBER"]

const workspaceMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    role: {
      type: String,
      enum: ROLES,
      default: "MEMBER",
    },
  },
  { timestamps: true },
)

workspaceMembershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true })

const WorkspaceMembership = mongoose.model("WorkspaceMembership", workspaceMembershipSchema)

export default WorkspaceMembership
export { ROLES }
