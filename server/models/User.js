import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: String,
  photoURL: String,
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  },
  role: {
    type: String,
    enum: ["owner", "member"]
  },
  youtube: {
    connected: {
      type: Boolean,
      default: false
    },
    accessToken: String,
    refreshToken: String,
    channelId: String,
    channelName: String,
    quotaUsed: {
      type: Number,
      default: 0
    },
    quotaResetAt: Date,
    uploadLimitReached: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("User", userSchema);
