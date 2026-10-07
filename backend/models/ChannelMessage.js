import mongoose from "mongoose"

const attachmentSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    previewUrl: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: "",
    },
    resourceType: {
      type: String,
      default: "auto",
    },
    format: {
      type: String,
      default: "",
    },
    mimeType: {
      type: String,
      default: "",
    },
    size: {
      type: Number,
      default: 0,
    },
    extension: {
      type: String,
      default: "",
    },
  },
  { _id: true }
)

const mentionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
)

const forwardedFromSchema = new mongoose.Schema(
  {
    originalMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    senderName: {
      type: String,
      default: "",
    },
    senderAvatar: {
      type: String,
      default: "",
    },
    originalContent: {
      type: String,
      default: "",
    },
    originalAttachments: {
      type: [attachmentSchema],
      default: [],
    },
    originalCreatedAt: {
      type: Date,
      default: null,
    },
    sourceType: {
      type: String,
      enum: ["CHANNEL", "DIRECT", ""],
      default: "",
    },
    sourceName: {
      type: String,
      default: "",
    },
    sourceId: {
      type: String,
      default: "",
    },
  },
  { _id: false }
)

const channelMessageSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    mentions: {
      type: [mentionSchema],
      default: [],
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChannelMessage",
      default: null,
    },
    forwardedFrom: {
      type: forwardedFromSchema,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    starredBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
      index: true,
    },
  },
  { timestamps: true },
)

const ChannelMessage = mongoose.model("ChannelMessage", channelMessageSchema)

export default ChannelMessage