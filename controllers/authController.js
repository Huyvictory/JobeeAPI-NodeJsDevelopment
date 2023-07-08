const UserModel = require("../models/users");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ExceptionHandler = require("../utils/exceptionHandler");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

//Register a new user
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const user = await UserModel.create({
    name,
    email,
    password,
    role,
  });

  sendToken(user, 200, res);
});

//Login user => /api/v1/login
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  //Check if email or password is entered by user
  if (!email || !password) {
    return next(new ExceptionHandler("Please enter email & password", 400));
  }

  //Find user in database
  const user = await UserModel.findOne({ email }).select("+password");

  if (!user) {
    return next(new ExceptionHandler("Invalid email or password", 401));
  }

  //Check if password the user has sent to server is correct or not
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ExceptionHandler("Invalid email or password", 401));
  }

  sendToken(user, 200, res);
});

// Forgot password => /api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await UserModel.findOne({ email: req.body.email });

  if (!user) {
    return next(new ExceptionHandler("No user found with this email.", 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset password url
  const resetPasswordUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/password/reset/${resetToken}`;

  const message = `Your password reset link is as follow: \n\n ${resetPasswordUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Reset your password (Jobee - API)",
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent successfully to: ${user.email}`,
    });
  } catch (error) {
    user.resetPassowrdToken = undefined;
    user.resetPassowrdExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ExceptionHandler("Email is not sent succesfully", 500));
  }
});

// Reset Password => /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await UserModel.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ExceptionHandler(
        "Password Reset token is invalid or has been expired.",
        400
      )
    );
  }

  // Set up new password

  user.password = req.body.password;
  user.resetPassowrdToken = undefined;
  user.resetPassowrdExpire = undefined;
  await user.save({ validateBeforeSave: false });

  sendToken(user, 200, res);
});

// Logout user => /api/v1/logout
exports.logOut = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Log out successfully",
  });
});
