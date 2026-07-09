import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['upload', 'download'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending'
  },
  ownerEmail: {
    type: String,
    required: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File"
  },
  progress: {
    type: Number,
    default: 0
  },
  error: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Job", jobSchema);
