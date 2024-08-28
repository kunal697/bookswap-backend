// routes/bookRoutes.js
const express = require("express");
const router = express.Router();
const bookController = require("../controller/bookController");
const protected = require("../middleware/authMiddleware");

router.post("/", protected, bookController.listBook);
router.put("/:id", protected, bookController.editBook);
router.delete("/:id", protected, bookController.deleteBook);
router.get("/owned/:id", protected, bookController.getOwnedBooks);
router.get("/matches/:id", protected, bookController.findPotentialMatches);
router.post("/:id/wantedBooks", protected, bookController.addToWantedBooks);
router.get("/wishlist", protected, bookController.getWishlist);
router.get(
  "/recommandations",
  protected,
  bookController.getBookRecommendations
);
router.get("/search", protected, bookController.searchBooks);

module.exports = router;
