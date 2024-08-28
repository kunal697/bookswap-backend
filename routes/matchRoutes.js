// routes/matchRoutes.js
const express = require("express");
const router = express.Router();
const matchController = require("../controller/matchController");

router.get("/:userId", matchController.getMatches);

module.exports = router;
