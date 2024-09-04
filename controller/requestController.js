// controllers/exchangeController.js
const Exchange = require("../models/Request");
const User = require("../models/User");
const Book = require("../models/Book");
const Request = require("../models/Request");

// Controller to send a book exchange request
exports.sendRequest = async (req, res) => {
  const { bookId, toUserId } = req.body;

  try {
    const book = await Book.findById(bookId);
    if (!book || !book.owner.equals(toUserId)) {
      return res.status(400).json({ error: "Invalid book or owner." });
    }

    const exchangeRequest = new Exchange({
      book: bookId,
      fromUser: req.user, // req.user is set by the protected middleware
      toUser: toUserId,
    });

    await exchangeRequest.save();
    res.status(201).json({ message: "Exchange request sent successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to respond to a book exchange request
exports.respondRequest = async (req, res) => {
  const { requestId, status } = req.body;

  try {
    const exchangeRequest = await Exchange.findById(requestId).populate(
      "book fromUser toUser"
    );

    if (!exchangeRequest || exchangeRequest.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Invalid request or already processed." });
    }

    // Ensure the user responding is the intended recipient (toUser)
    if (!exchangeRequest.toUser._id.equals(req.user)) {
      return res
        .status(403)
        .json({ error: "You are not authorized to respond to this request." });
    }

    if (status === "accepted") {
      const { book, fromUser, toUser } = exchangeRequest;
      console.log(book);
      console.log(fromUser);
      console.log(toUser);

      // Transfer the book ownership
      fromUser.ownedBooks.push(book._id);
      await toUser.save();

      toUser.ownedBooks = fromUser.ownedBooks.filter(
        (ownedBook) => !ownedBook.equals(book._id)
      );
      await fromUser.save();

      book.owner = fromUser._id;
      await book.save();

      exchangeRequest.status = "accepted";
      await exchangeRequest.save();

      res
        .status(200)
        .json({ message: "Book exchange completed successfully." });
    } else if (status === "rejected") {
      exchangeRequest.status = "rejected";
      await exchangeRequest.save();
      res.status(200).json({ message: "Book exchange request rejected." });
    } else {
      res.status(400).json({ error: "Invalid status." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOutgoingRequests = async (req, res) => {
  try {
    const outgoingRequests = await Request.find({ fromUser: req.user })
      .populate("book toUser")
      .exec();
    const formattedRequests = outgoingRequests.map((request) => ({
      _id: request._id,
      book: {
        _id: request.book._id,
        title: request.book.title,
        author: request.book.author,
        genre: request.book.genre,
        imageUrl: request.book.imageUrl,
        owner: request.book.owner,
        __v: request.book.__v,
      },
      toUser: {
        _id: request.toUser._id,
        username: request.toUser.username,
      },
      status: request.status,
    }));

    res.status(200).json(formattedRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getIncomingRequests = async (req, res) => {
  try {
    const incomingRequests = await Request.find({ toUser: req.user })
      .populate("book fromUser")
      .exec();

    res.status(200).json(incomingRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
