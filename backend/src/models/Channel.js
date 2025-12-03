// src/models/Channel.js
const mongoose = require('mongoose');

const ChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPrivate: { type: Boolean, default: false },
  capacity: { type: Number, default: 0 }, // 0 = unlimited
  createdAt: { type: Date, default: Date.now }
});

// indexes
ChannelSchema.index({ name: 1 });
ChannelSchema.index({ members: 1 });

module.exports = mongoose.models.Channel || mongoose.model('Channel', ChannelSchema);
