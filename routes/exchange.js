// routes/exchange.js
const express = require("express");
const router = express.Router();
const {
  sendRequest,
  respondRequest,
  getOutgoingRequests,
  getIncomingRequests,
} = require("../controller/requestController");
const protected = require("../middleware/authMiddleware");
router.post("/request", protected, sendRequest);
router.post("/response", protected, respondRequest);
router.get("/outgoing", protected, getOutgoingRequests);
router.get("/incoming", protected, getIncomingRequests);

module.exports = router;
