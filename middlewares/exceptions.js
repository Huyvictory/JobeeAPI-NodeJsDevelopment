module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let ExceptionMessage = err.message || "Internal Server Error";

  switch (process.env.NODE_ENV) {
    case "production":
      if (err.name === "ValidationError") {
        statusCode = 400;
      }

      if (err.code === 11000) {
        statusCode = 400;
        ExceptionMessage = "Duplicate email entered";
      }

      // Handle wrong JWT token error
      if (err.name === "JsonWebTokenError") {
        statusCode = 500;
        ExceptionMessage = "JSON Web Token is invalid. Try again!";
      }
      res.status(statusCode).json({
        success: false,
        message: ExceptionMessage,
      });
      break;
    default:
      res.status(statusCode).json({
        success: false,
        error: err,
        message: ExceptionMessage,
        stack: err.stack,
      });
      break;
  }
};
