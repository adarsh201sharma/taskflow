const mongoose = require('mongoose');

const ListSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    position: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ListSchema.index({ board: 1, position: 1 });

module.exports = mongoose.model('List', ListSchema);
