const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.signup = (req, res, next) => {
  const errors = validationResult(req);

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed!");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  //Hash user Password to store in DB
  const hashedPassword = bcrypt.hashSync(password, 12);

  const user = new User({
    email: email,
    password: hashedPassword,
    name: name,
  });

  user.save().then((result) => {
    res.status(201).json({ message: "User created!", userId: result._id });
  });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;

  //Check if User is in DB
  User.findOne({ email: email })
    .then((user) => {
      //IF not in DB,throw error
      if (!user) {
        const error = new Error("User not found!");
        error.statusCode = 401;
        throw error;
      }

      loadedUser = user;

      let isEqual = bcrypt.compareSync(password, user.password);

      //if Password don't match, throw error!
      if (!isEqual) {
        const error = new Error("Wrong Password!");
        error.statusCode = 401;
        throw error;
      }

      //Create JWT token
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUserStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error("User not Found!");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ status: user.status });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
exports.updateUserStatus = (req, res, next) => {
  const newStatus = req.body.status;
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error("User not Found!");
        error.statusCode = 404;
        throw error;
      }
      user.status = newStatus;
      user.save();
    })
    .then((result) => {
      res.status(200).json({ message: "User Status Updated!" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
