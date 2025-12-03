// src/models/Message.js
const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  url: String,
  filename: String
});

const MessageSchema = new mongoose.Schema({
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  attachments: { type: [AttachmentSchema], default: [] },
  createdAt: { type: Date, default: Date.now, index: true }
});

MessageSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
