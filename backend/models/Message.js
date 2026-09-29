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
  },
  { timestamps: true },
)

messageSchema.index({ receiverId: 1, isRead: 1, senderId: 1 })

const Message = mongoose.model("Message", messageSchema)

export default Message
