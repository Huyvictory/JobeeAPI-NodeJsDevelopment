const jwt = require("jsonwebtoken");
const UserModel = require("../models/users");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ExceptionHandler = require("../utils/exceptionHandler");

//Check if the user is authenticated or not
exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ExceptionHandler("Please sign in to proceed", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.user = await UserModel.findById(decoded.id);

  next();
});

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ExceptionHandler(
          `You are not allowed to use this API`,
          403
        )
      );
    }
    next();
  };
};
