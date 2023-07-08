const UserModel = require("../models/users");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors.js");
const ExceptionHandler = require("../utils/exceptionHandler");
const sendToken = require("../utils/jwtToken");
const JobModel = require("../models/jobs");
const fs = require("fs");
const APIFilters = require("../utils/apiFilters");

// Get current user profile => /api/v1/me
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await UserModel.findById(req.user.id).populate({
    path: "jobsPublished",
    select: "title postingDate",
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Update current user password => /api/v1/password/update
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await UserModel.findById(req.user.id).select("+password");

  // Check previous password of user
  const isMatched = await user.comparePassword(req.body.currentPassword);
  if (!isMatched) {
    return next(new ExceptionHandler("Current password is incorrect", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendToken(user, 200, res);
});

// Update current user data => /api/v1/me/update
exports.updateUser = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await UserModel.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({ success: true, data: user });
});

// Show all applied jobs => /api/v1/jobs/applied
exports.getAppliedJobs = catchAsyncErrors(async (req, res, next) => {
  const jobs = await JobModel.find({
    "applicantsApplied.id": req.user.id,
  }).select("+applicantsApplied");

  res.status(200).json({
    success: true,
    results: jobs.length,
    dat: jobs,
  });
});

// Show all jobs published by an employer => /api/v1/jobs/published
exports.getPublishedJobs = catchAsyncErrors(async (req, res, next) => {
  const jobs = await JobModel.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    results: jobs.length,
    data: jobs,
  });
});

// Delete current user => /api/v1/me/delete
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  // Delete user data that's connected to the currently requesting user
  catchAsyncErrors(deleteUserData(req.user.id, req.user.role));

  const user = await UserModel.findByIdAndDelete(req.user.id);
  res.cookie("token", "none", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Your account has been deleted",
  });
});

// Adding controller methods that can only be accessible by admins
// Show all user => /api/v1/users
exports.getUsers = catchAsyncErrors(async (req, res, next) => {
  const apiFilters = new APIFilters(UserModel, req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const users = await apiFilters.query;

  res.status(200).json({
    success: true,
    results: users.length,
    data: users,
  });
});

// Delete user(Admin) => /api/v1/user/:id
exports.adminDeleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await UserModel.findById(req.params.id);

  if (!user) {
    return next(
      new ExceptionHandler(`User not found with id: ${req.params.id}`)
    );
  }

  deleteUserData(user.id, user.role);
  await UserModel.deleteOne({ _id: req.params.id });

  res.status(200).json({
    success: true,
    message: "User is deleted by Admin successfully",
  });
});

const deleteUserData = async (user, role) => {
  if (role === "employer") {
    await JobModel.deleteMany({ user: user });
  }

  if (role === "user") {
    const appliedJobs = await JobModel.find({
      "applicantsApplied.id": user,
    }).select("+applicantsApplied");

    for (let i = 0; i < appliedJobs.length; i++) {
      let obj = appliedJobs[i].applicantsApplied.find((o) => o.id === user);

      let filepath = `${__dirname}/public/uploads/${obj.resume}`.replace(
        "\\controllers",
        ""
      );

      fs.unlink(filepath, (err) => {
        if (err) {
          return console.log(err);
        }
      });

      appliedJobs[i].applicantsApplied.splice(
        appliedJobs[i].applicantsApplied.indexOf(obj.id)
      );

      await appliedJobs[i].save();
    }
  }
};
