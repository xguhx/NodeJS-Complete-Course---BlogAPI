const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const { clearImage } = require("./util/file");
require("dotenv").config();

const { graphqlHTTP } = require("express-graphql");
const graphQLSchema = require("./graphQL/schema");
const graphQLResolver = require("./graphQL/resolvers");

const auth = require("./middleware/auth");
const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4());
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: storage, fileFilter: fileFilter }).single("image"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(auth);

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello, This is the REST API for the Blog App",
  });
});

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not Authenticated!");
  }

  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }

  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res.status(201).json({
    message: "File Stored",
    filePath: req.file.path.replace("\\", "/"),
  });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphQLSchema,
    rootValue: graphQLResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occurred!";
      const code = err.originalError.code || 500;
      return {
        message: message,
        status: code,
        data: data,
      };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(process.env.DBSTRING)
  .then((result) => {
    app.listen(process.env.PORT || 8080);
  })
  .catch((err) => console.log(err));
