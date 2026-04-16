import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'error'],
    required: true,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    patientContext: {
      patientName: { type: String, default: '' },
      disease: { type: String, default: '' },
      location: { type: String, default: '' },
    },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', ConversationSchema);
