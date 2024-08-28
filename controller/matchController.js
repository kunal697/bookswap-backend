// controllers/matchController.js
const Book = require("../models/Book");

exports.getMatches = async (req, res) => {
  const userId = req.params.userId;
  const userBooks = await Book.find({ owner: userId });
  const userGenres = userBooks.map((book) => book.genre);

  const potentialMatches = await Book.find({
    owner: { $ne: userId },
    genre: { $in: userGenres },
  });

  res.status(200).send(potentialMatches);
};
