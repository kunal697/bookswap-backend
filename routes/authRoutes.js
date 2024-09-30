// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controller/authController.js");
const { verifyToken } = require("../middleware/verifyToken.js");

router.post("/register", authController.register);
router.get("/verify/:token", authController.verifyEmail);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", verifyToken,authController.fetchUser);

module.exports = router;
