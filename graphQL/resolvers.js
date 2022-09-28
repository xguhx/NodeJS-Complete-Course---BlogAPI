const User = require("../models/user");
const Post = require("../models/post");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const { clearImage } = require("../util/file");
require("dotenv").config();

module.exports = {
  createUser: async ({ userInput }, req) => {
    const errors = [];

    //validate Input
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "Invalid Email!" });
    }

    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: "Password too short!" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email: userInput.email });

    //check if user already exists
    if (existingUser) {
      throw new Error("User already exists!");
    }

    const hashedPassword = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPassword,
    });

    const createdUser = await user.save();

    return {
      ...this.createUser._doc,
      _id: createdUser._id.toString(),
      email: userInput.email,
    };
  },

  login: async ({ email, password }) => {
    const user = await User.findOne({ email: email });

    //check if there is a user
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);

    //check if password match
    if (!isEqual) {
      const error = new Error("Incorrect Password!");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    return { token: token, userId: user._id.toString() };
  },

  createPost: async ({ postInput }, req) => {
    const errors = [];

    //Check if authenticated
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }

    //Input Validation
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid!" });
    }

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid!" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);

    //check if there is a user
    if (!user) {
      const error = new Error("Invalid user!");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });
    const createdPost = await post.save();

    user.posts.push(createdPost);

    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  posts: async ({ page }, req) => {
    //check for authentication
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }

    const perPage = 2;

    const totalPosts = await Post.find().countDocuments();

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },

  post: async ({ postId }, req) => {
    //check if authenticated
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate("creator");

    //check if we got a post
    if (!post) {
      const error = new Error("Post not found");
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  updatePost: async ({ postId, postInput }, req) => {
    const errors = [];

    //check if authenticated
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate("creator");

    //check if we got a post
    if (!post) {
      const error = new Error("Post not found");
      error.code = 404;
      throw error;
    }

    //check if creators and user are the same
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not Authorized");
      error.code = 403;
      throw error;
    }

    //validation
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid!" });
    }

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid!" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    post.title = postInput.title;
    post.content = postInput.content;
    post.imageUrl =
      postInput.imageUrl === "undefined" ? post.imageUrl : postInput.imageUrl;

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  deletePost: async ({ postId }, req) => {
    //Check for authentication
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId);

    //check if we got a post
    if (!post) {
      const error = new Error("Post not found");
      error.code = 404;
      throw error;
    }

    //check if creators and user are the same
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not Authorized");
      error.code = 403;
      throw error;
    }
    try {
      clearImage(post.imageUrl);
      await Post.findByIdAndRemove(postId);
      const user = await User.findById(req.userId);
      user.posts.pull(postId);
      await user.save();
    } catch (err) {
      return false;
    }
    return true;
  },

  getUserStatus: async ({ userId }, req) => {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not Found!");
    }

    return { ...user._doc };
  },

  editUserStatus: async ({ userId, userInput }, req) => {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }

    let user = await User.findById(userId);
    if (!user) {
      throw new Error("User not Found!");
    }

    user.status = userInput;
    user = await user.save();

    return { ...user._doc };
  },
};
