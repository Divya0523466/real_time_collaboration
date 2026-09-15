import mongoose from "mongoose"

const channelReadStateSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

channelReadStateSchema.index({ channelId: 1, userId: 1 }, { unique: true })

const ChannelReadState = mongoose.model("ChannelReadState", channelReadStateSchema)

export default ChannelReadState
