const mongoose = require('mongoose');

// Atomic, per-key sequence counter. Used to generate monthly order serials
// (key = "order-YYMM") without races: findOneAndUpdate($inc) is atomic, so two
// concurrent orders can never receive the same serial number.
const counterSchema = new mongoose.Schema({
  _id: { type: String },      // e.g. "order-2606"
  seq: { type: Number, default: 0 }
});

// Returns the next sequence value for the given key, creating it at 1 on first use.
counterSchema.statics.next = async function (key) {
  const doc = await this.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
