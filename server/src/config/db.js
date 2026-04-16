import mongoose from 'mongoose';

/**
 * Connects to MongoDB. Soft-fails so the server still starts
 * if Mongo is unavailable — conversation history will just be disabled.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.trim() === '') {
    console.warn('⚠️  MONGO_URI not set — conversation history disabled.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error(`⚠️  MongoDB connection failed: ${err.message}`);
    console.warn('   Continuing without MongoDB — conversation history disabled.');
  }
}
