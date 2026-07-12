import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema({
  chunkIndex: {
    type: Number,
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  youtubeAccountEmail: {
    type: String,
    required: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const fileSchema = new mongoose.Schema({
  ownerEmail: {
    type: String,
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  },
  filename: {
    type: String,
    required: true
  },
  mimeType: String,
  extension: String,
  sizeBytes: Number,
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null
  },
  uploadMethod: {
    type: String,
    enum: ['encrypted', 'direct'],
    default: 'encrypted'
  },
  youtubeVideoId: {
    type: String,
    default: null
  },
  chunks: [chunkSchema]
});

export default mongoose.model("File", fileSchema);
