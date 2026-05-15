const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BoardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '#3B82F6' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [MemberSchema], default: [] },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BoardSchema.index({ 'members.user': 1 });

BoardSchema.methods.hasAccess = function (userId, requiredRoles = ['owner', 'editor', 'viewer']) {
  if (this.owner.equals(userId)) return true;
  return this.members.some(
    (m) => m.user.equals(userId) && requiredRoles.includes(m.role)
  );
};

BoardSchema.methods.canEdit = function (userId) {
  return this.hasAccess(userId, ['owner', 'editor']);
};

module.exports = mongoose.model('Board', BoardSchema);
