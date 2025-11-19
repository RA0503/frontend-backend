import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const AdminSchema = new Schema({
  email: { type: String, required: true, unique: true},
  passwordHash: { type: String, required: true },
  name: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

export default model('Admin', AdminSchema);
