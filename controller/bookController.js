// controllers/bookController.js
const Book = require("../models/Book");
const multer = require("multer");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.listBook = [
  upload.single("image"), // Use the upload middleware for handling single file upload
  async (req, res) => {
    try {
      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }

      const { title, author, genre } = req.body;
      const owner = req.user;

      // Check if the same user has already listed a book with the same title, author, and genre
      const existingBook = await Book.findOne({ title, author, genre, owner });

      if (existingBook) {
        return res.status(400).send("You've already listed this book.");
      }

      // Upload the file to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              return reject(new Error("Cloudinary upload failed."));
            }
            resolve(result); // Resolve with the result containing the image URL
          }
        );
        uploadStream.end(req.file.buffer); // Uploading buffer instead of path
      });

      // Create a new book with the uploaded image URL and other data
      const book = new Book({
        title,
        author,
        genre,
        imageUrl: result.secure_url, // Store the image URL in the database
        owner,
      });

      // Save the book to the database
      await book.save();

      // Update the user's ownedBooks list
      await User.findByIdAndUpdate(owner, { $push: { ownedBooks: book._id } });

      // Send the book data in the response
      res.status(201).send(book);
    } catch (err) {
      // Log the error and send a 500 response
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },
];

exports.editBook = async (req, res) => {
  try {
    const updates = req.body;

    // Ensure there are fields to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).send({ message: "No fields to update." });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updates }, // Only update the fields provided
      { new: true, runValidators: true } // Return the updated document and run schema validations
    );

    if (!book) {
      return res.status(404).send({ message: "Book not found." });
    }

    res.status(200).send(book);
  } catch (error) {
    console.error("Error updating the book:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;

    // Find the book to be deleted
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).send("Book not found");
    }

    // Check if the owner exists
    const owner = await User.findOne(book.owner);
    if (!owner) {
      return res.status(404).send("Owner not found");
    }

    console.log(`Deleting book with ID: ${bookId} from owner: ${owner._id}`);

    // Use $pull operator to remove the book reference from the owner's ownedBooks array
    await User.findOneAndUpdate(book.owner, {
      $pull: { ownedBooks: bookId },
    });
    // console.log("Update result:", updateResult);

    // Delete the book from the collection
    await Book.findOneAndDelete(bookId);

    res.status(200).send("Book deleted and removed from owner's ownedBooks");
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getOwnedBooks = async (req, res) => {
  try {
    const userId = req.user;

    // Find the user and populate the ownedBooks field
    const user = await User.findById(userId).populate("ownedBooks");

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Return the ownedBooks
    res.status(200).send(user.ownedBooks);
  } catch (error) {
    console.error("Error fetching owned books:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

exports.findPotentialMatches = async (req, res) => {
  try {
    // Fetch the user and their wanted books
    const userId = req.user;
    const user = await User.findById(userId).populate("wantedBooks").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch all other users and their owned books
    const users = await User.find({ _id: { $ne: userId } })
      .populate("ownedBooks")
      .lean();
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "No other users found" });
    }

    const potentialMatches = [];

    // Extract filters from query parameters
    const { author, title, genre } = req.query;

    // Match books based on author's wanted books criteria
    user.wantedBooks.forEach((wantedBook) => {
      users.forEach((potentialMatch) => {
        potentialMatch.ownedBooks.forEach((ownedBook) => {
          // Check if the book matches the user's wanted book by title, author, or genre
          const isMatchingBook =
            wantedBook.title === ownedBook.title ||
            wantedBook.author === ownedBook.author ||
            wantedBook.genre === ownedBook.genre;

          if (isMatchingBook) {
            const matchesTitle = title
              ? ownedBook.title.toLowerCase().includes(title.toLowerCase())
              : true;
            const matchesAuthor = author
              ? ownedBook.author.toLowerCase().includes(author.toLowerCase())
              : true;
            const matchesGenre = genre
              ? ownedBook.genre.toLowerCase().includes(genre.toLowerCase())
              : true;

            if (matchesTitle && matchesAuthor && matchesGenre) {
              potentialMatches.push({
                matchedUser: potentialMatch.username,
                matchedBook: {
                  title: ownedBook.title,
                  author: ownedBook.author,
                  genre: ownedBook.genre,
                  imageUrl: ownedBook.imageUrl,
                  id: ownedBook._id,
                },
              });
            }
          }
        });
      });
    });

    if (potentialMatches.length === 0) {
      return res.status(200).json({ message: "No matches found" });
    }

    res.status(200).json(potentialMatches);
  } catch (error) {
    console.error("Error finding potential matches:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addToWantedBooks = async (req, res) => {
  try {
    const userId = req.user; // ID of the user who wants to add the book
    const bookId = req.body.bookId; // ID of the book to be added to wantedBooks

    // Find the user
    const user = await User.findById(userId).populate("wantedBooks");
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Check if the book exists in the database
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).send("Book not found");
    }

    // Check if the book is already in the user's wantedBooks
    const alreadyWanted = user.wantedBooks.some(
      (wantedBook) => wantedBook._id.toString() === book._id.toString()
    );
    if (alreadyWanted) {
      return res.status(400).send("Book is already in your wanted list");
    }

    // Add the book to the user's wantedBooks
    user.wantedBooks.push(book._id);
    await user.save();

    res.status(200).json({
      message: "Book added to wanted list",
      wantedBooks: user.wantedBooks,
    });
  } catch (error) {
    console.error("Error adding to wanted books:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user; // Extract user ID from the middleware

    // Fetch the user's wanted books
    const user = await User.findById(userId).populate("wantedBooks");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ wishlist: user.wantedBooks });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getBookRecommendations = async (req, res) => {
  try {
    const userId = req.user; // Extract user ID from the middleware

    // Fetch the user's owned and wanted books
    const user = await User.findById(userId).populate("ownedBooks wantedBooks");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract user's owned and wanted books details
    const userOwnedBooks = user.ownedBooks;
    const userWantedBooks = user.wantedBooks;

    // Create sets to store unique titles, genres, and authors
    const wantedTitles = new Set(userWantedBooks.map((book) => book.title));
    const wantedGenres = new Set(userWantedBooks.map((book) => book.genre));
    const wantedAuthors = new Set(userWantedBooks.map((book) => book.author));

    const ownedTitles = new Set(userOwnedBooks.map((book) => book.title));
    const ownedGenres = new Set(userOwnedBooks.map((book) => book.genre));
    const ownedAuthors = new Set(userOwnedBooks.map((book) => book.author));

    // Fetch all books that do not belong to the user
    const otherBooks = await Book.find({ owner: { $ne: userId } }).populate(
      "owner"
    );

    // Filter books based on the criteria
    const matchingWantedBooks = otherBooks.filter(
      (book) =>
        wantedTitles.has(book.title) ||
        wantedGenres.has(book.genre) ||
        wantedAuthors.has(book.author)
    );

    const matchingOwnedBooks = otherBooks.filter(
      (book) =>
        ownedTitles.has(book.title) ||
        ownedGenres.has(book.genre) ||
        ownedAuthors.has(book.author)
    );

    // Remove duplicates between matchingWantedBooks and matchingOwnedBooks
    const remainingBooks = otherBooks.filter(
      (book) =>
        !matchingWantedBooks.includes(book) &&
        !matchingOwnedBooks.includes(book)
    );

    // Combine the results: first matching wanted books, then matching owned books, then remaining books
    const recommendedBooks = [
      ...matchingWantedBooks,
      ...matchingOwnedBooks,
      ...remainingBooks,
    ];

    res.status(200).json({ recommendedBooks });
  } catch (error) {
    console.error("Error fetching book recommendations:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.searchBooks = async (req, res) => {
  try {
    const { name, author, genre } = req.query;
    const userId = req.user; // Extract user ID from the middleware

    // Build search criteria
    const searchCriteria = {
      $and: [
        { owner: { $ne: userId } }, // Exclude books owned by the current user
        {
          $and: [
            name ? { title: { $regex: name, $options: "i" } } : {}, // Case-insensitive search on title
            author ? { author: { $regex: author, $options: "i" } } : {}, // Case-insensitive search on author
            genre ? { genre: { $regex: genre, $options: "i" } } : {}, // Case-insensitive search on genre
          ].filter(Boolean), // Remove empty objects if no query parameter is provided
        },
      ],
    };

    // Fetch books based on search criteria
    const books = await Book.find(searchCriteria).populate("owner", "username");

    res.status(200).json({ books });
  } catch (error) {
    console.error("Error while searching for books:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteWantedBook = async (req, res) => {
  try {
    const userId = req.user;
    const bookId = req.params.bookId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the book is in the user's wantedBooks list
    const bookIndex = user.wantedBooks.indexOf(bookId);
    if (bookIndex === -1) {
      return res.status(404).json({ error: "Book not found in wanted list" });
    }

    // Remove the book from the wantedBooks list
    user.wantedBooks.splice(bookIndex, 1);
    await user.save();

    res.status(200).json({ message: "Book removed from wanted list" });
  } catch (error) {
    console.error("Error deleting wanted book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
