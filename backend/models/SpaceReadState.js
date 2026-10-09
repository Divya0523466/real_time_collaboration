import mongoose from "mongoose"

const spaceReadStateSchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
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
  { timestamps: true }
)

spaceReadStateSchema.index({ spaceId: 1, userId: 1 }, { unique: true })

const SpaceReadState = mongoose.model("SpaceReadState", spaceReadStateSchema)

export default SpaceReadState
