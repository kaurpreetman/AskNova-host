import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: String,
  datasets: [String],
  trainingData: String,
  timestamp: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  sessionId: String,
  title: String,
  messages: [MessageSchema],
  datasets: [String],
  lastActive: { type: Date, default: Date.now }
});

const HistorySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessions: [SessionSchema]
});

const History = mongoose.model('History', HistorySchema);
export default History;