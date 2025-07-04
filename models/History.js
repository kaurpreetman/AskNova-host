import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: String,
  datasets: [
    {
      title: String,
      url: String,
      subtitle: String,
      creatorName: String,
      downloadCount: Number
    }
  ],
  trainingData: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
  sessionId: String,
  title: String,
  messages: [MessageSchema],
  datasets: [
    {
      title: String,
      url: String,
      subtitle: String,
      creatorName: String,
      downloadCount: Number
    }
  ],
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

const HistorySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessions: [SessionSchema]
});

const History = mongoose.model('History', HistorySchema);
export default History;