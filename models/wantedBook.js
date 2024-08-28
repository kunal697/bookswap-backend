const mongoose = require("mongoose");

const wantedBookSchema = new mongoose.Schema({
  title: String,
  author: String,
  genre: String,
  imageUrl: String,
  requestee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("WantedBook", wantedBookSchema);
