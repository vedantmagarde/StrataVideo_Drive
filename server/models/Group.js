import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  ownerEmail: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  invitedEmails: [{
    type: String
  }],
  memberEmails: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Group", groupSchema);
