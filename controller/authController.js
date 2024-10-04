// controllers/authController.js
const User = require("../models/User");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.register = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send("Email already registered");
  }

  const verificationToken = crypto.randomBytes(20).toString("hex");
  const user = new User({
    username,
    email,
    password,
    verified: false,
    verificationToken,
  });
  await user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verificationLink = `${process.env.BASE_URL}/api/auth/verify/${verificationToken}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email",
    text: `Please click on the following link to verify your email: ${verificationLink}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });

  res
    .status(201)
    .send("User registered. Please check your email for verification.");
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return res.status(400).send("Invalid verification token");
  }

  user.verified = true;
  user.verificationToken = undefined;
  await user.save();

  res.status(200).send("Email verified successfully");
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send("Invalid credentials");
    }

    // Check if the user is verified
    if (!user.verified) {
      return res.status(401).send("Email not verified");
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).send("Invalid credentials");
    }

    // Generate a JWT token if credentials are valid
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "21d",
    });

    // Respond with the token
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.fetchUser = async (req, res) => {
  try {
    const userId = req.user.id;
    // console.log("User ID:", userId); 

    const user = await User.findById(userId).populate("ownedBooks wantedBooks"); 

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user); 
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.logout = (req, res) => {
  res.status(200).send("Logged out");
};
