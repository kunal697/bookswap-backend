// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verified: Boolean,
  verificationToken: String,
  ownedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
  wantedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
});

userSchema.pre("save", async function (next) {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Hash the password using the salt
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare plain text password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // Compare the plain password with the hashed password
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = mongoose.model("User", userSchema);
