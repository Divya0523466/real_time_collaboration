import mongoose from "mongoose"

const CHANNEL_TYPES = ["PUBLIC", "PRIVATE"]

const channelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: CHANNEL_TYPES,
      default: "PUBLIC",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
)

channelSchema.index({ workspaceId: 1, type: 1 });
channelSchema.index({ workspaceId: 1, name: 1 });

const Channel = mongoose.model("Channel", channelSchema)

export default Channel
