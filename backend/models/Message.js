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

const reactionUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      default: "",
    },
  },
  { _id: false }
)

const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
      required: true,
    },
    users: {
      type: [reactionUserSchema],
      default: [],
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

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
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
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    starredBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
      index: true,
    },
    deletedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
      index: true,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  { timestamps: true },
)

messageSchema.index({ receiverId: 1, isRead: 1, senderId: 1 })
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema)

export default Message
