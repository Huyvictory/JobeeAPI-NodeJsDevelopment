const express = require("express");
const dotenv = require("dotenv");
const connectDatabase = require("./config/database");
const exceptionsMiddleware = require("./middlewares/exceptions");
const ExceptionHandler = require("./utils/exceptionHandler");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();

//Setting up config.env file variables
dotenv.config({ path: "./config/config.env" });

//Specifiy port for development environment
const PORT = process.env.PORT;

//Handle when server is facing some problems (e.g: Unhandled promise rejection)
process.on("unhandledRejection", (error) => {
  console.log(`Error: ${error.message}`);
  console.log("Shutting down the server due to unhandled promise rejection");
  server.close(() => {
    process.exit(1);
  });
});

//Hanling Uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down server due to uncaught exception");
  server.close(() => {
    process.exit(1);
  });
});

//Connect to database
connectDatabase();

// Set up body parser
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files of server
app.use(express.static("public"));

//Body parser json for server
app.use(express.json());

//Set cookie parser
app.use(cookieParser());

// Handle file uploads
app.use(fileUpload());

// Rate Limiting
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 200 });

app.use(limiter);

// Set up security headers
app.use(helmet());

// Sanitize data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xssClean());

// Prevent parameter pollution
app.use(hpp());

// Setup CORS - Accessible by other domains
app.use(cors());

//Get all routes of module job
const jobsRouteAPI = require("./routes/jobs");
const authRouteAPI = require("./routes/auth");
const userRouteAPI = require("./routes/user");

app.use("/api/v1", jobsRouteAPI);
app.use("/api/v1", authRouteAPI);
app.use("/api/v1", userRouteAPI);

//Handling not supported routes
app.all("*", (req, res, next) => {
  next(new ExceptionHandler(`${req.originalUrl} route not found`, 404));
});

// Middleware to handle exception
app.use(exceptionsMiddleware);

const server = app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});
