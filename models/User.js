import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  githubId: { type: String, required: true, unique: true },
  username: String,
  email: String,
  avatarUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
export default User;
