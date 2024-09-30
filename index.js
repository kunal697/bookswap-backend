// server.js
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const authRoutes = require("./routes/authRoutes.js");
const bookRoutes = require("./routes/bookRoutes.js");
const exchangeRoutes = require("./routes/exchange.js");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

app.use(express.json());


app.use(cors());

app.use("/auth", authRoutes);
app.use("/exchange", exchangeRoutes);
app.use("/books", bookRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to Mongoose");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
