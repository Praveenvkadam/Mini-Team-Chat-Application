const mongoose = require('mongoose');

const ChannelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isPrivate: { type: Boolean, default: false },
    invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    capacity: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

ChannelSchema.options.toJSON.transform = function (doc, ret) {
  ret.id = ret._id;
  delete ret._id;
  return ret;
};

ChannelSchema.index({ name: 1 });
ChannelSchema.index({ members: 1 });
ChannelSchema.index({ createdBy: 1 });
ChannelSchema.index({ isPrivate: 1 });


module.exports = mongoose.models.Channel || mongoose.model('Channel', ChannelSchema);
