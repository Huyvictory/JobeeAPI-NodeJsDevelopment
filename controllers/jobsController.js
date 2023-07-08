const JobModel = require("../models/jobs");

const geoCoder = require("../utils/geocoder");
const ExceptionHandler = require("../utils/exceptionHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const APIFilters = require("../utils/apiFilters");
const path = require("path");
const fs = require("fs");

//Get all Jobs available
exports.getListJobs = catchAsyncErrors(async (req, res, next) => {
  const apiFilters = new APIFilters(JobModel.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .searchByQuery()
    .pagination();
  const jobs = await apiFilters.query;

  res.status(200).json({
    success: true,
    message: "Get list jobs successfully",
    total: jobs.length,
    data: jobs,
  });
});

//Create a new Job
exports.newJob = catchAsyncErrors(async (req, res, next) => {
  //Adding user to body
  req.body.user = req.user.id;

  const job = await JobModel.create(req.body);

  res.status(200).json({
    success: true,
    message: "Job created",
    data: job,
  });
});

// Search jobs with radius => api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = catchAsyncErrors(async (req, res, next) => {
  const { zipcode, distance } = req.params;

  //Getting latitude & longtitude from geocoder with zipcode & distance
  const location = await geoCoder.geocode(zipcode);
  const latitude = location[0].latitude;
  const longtitude = location[0].longitude;

  const radius = distance / 3963;

  const jobsBased_Location = await JobModel.find({
    location: {
      $geoWithin: { $centerSphere: [[longtitude, latitude], radius] },
    },
  });

  res.status(200).json({
    success: true,
    total: jobsBased_Location.length,
    data: jobsBased_Location,
  });
});

//Update a job's information => /api/v1/job/:id
exports.updateJob = catchAsyncErrors(async (req, res, next) => {
  let job = await JobModel.findById(req.params.id);

  if (!job) {
    return next(new ExceptionHandler("Job not found", 404));
  }

  // Check if the user is owner ob current job
  if (job.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ExceptionHandler(
        `User ${req.user.name} is not allowed to update this job`,
        400
      )
    );
  }

  job = await JobModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    userFindAndModify: false,
  });

  return res.status(200).json({
    success: true,
    message: "Job updated",
    data: job,
  });
});

// Delete a job => /api/v1/job/:id
exports.deleteJob = catchAsyncErrors(async (req, res, next) => {
  let jobToDelete = await JobModel.findById(req.params.id).select(
    "+applicantsApplied"
  );

  if (!jobToDelete) {
    return next(new ExceptionHandler("Job not found", 404));
  }

  // Check if the user is owner of current job
  if (
    jobToDelete.user.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ExceptionHandler(
        `User ${req.user.name} is not allowed to delete this job`,
        400
      )
    );
  }

  for (let i = 0; i < jobToDelete.applicantsApplied.length; i++) {
    let filepath =
      `${__dirname}/public/uploads/${jobToDelete.applicantsApplied[i].resume}`.replace(
        "\\controllers",
        ""
      );

    fs.unlink(filepath, (err) => {
      if (err) {
        return console.log(err);
      }
    });
  }

  jobToDelete = await JobModel.findByIdAndRemove(req.params.id);

  res.status(200).json({
    success: true,
    message: "Job deleted",
  });
});

//Get a single job with id and slug -> /api/v1/job/:id/:slug
exports.getJobIdSlug = catchAsyncErrors(async (req, res, next) => {
  const job = await JobModel.find({
    $and: [{ _id: req.params.id }, { slug: req.params.slug }],
  });

  if (!job.title) {
    return next(new ExceptionHandler("Job not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Job found",
    data: job,
  });
});

//Get stats about a topic (job) => /api/v1/stats/:topic
exports.getJobStatistics = catchAsyncErrors(async (req, res, next) => {
  const jobStats = await JobModel.aggregate([
    { $match: { $text: { $search: req.params.topic } } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        avgSalary: { $avg: "$salary" },
        sumPostions: { $sum: "$positions" },
        avgSalary: { $avg: "$salary" },
        minSalary: { $min: "$salary" },
        maxSalary: { $max: "$salary" },
      },
    },
  ]);

  if (jobStats.length === 0) {
    return next(new ExceptionHandler("Job not found", 404));
  }

  res.status(200).json({
    success: true,
    data: jobStats,
  });
});

// Apply to job using Resume => /api/v1/job/:id/apply
exports.applyJob = catchAsyncErrors(async (req, res, next) => {
  let job = await JobModel.findById(req.params.id).select("+applicantsApplied");

  if (!job) {
    return next(new ExceptionHandler("Job not found", 404));
  }

  // Check if job last date has been passed or not
  if (job.lastDate < new Date(Date.now())) {
    return next(
      new ExceptionHandler("You can not apply to this job. Overdue date", 400)
    );
  }

  // Check if user has applied the job before
  for (let i = 0; i < job.applicantsApplied.length; i++) {
    if (job.applicantsApplied[i].id === req.user.id) {
      return next(
        new ExceptionHandler("You have already applied for this job.", 400)
      );
    }
  }

  //Check the files
  if (!req.files) {
    return next(new ExceptionHandler("Please upload file.", 400));
  }

  const file = req.files.file;

  //Check file type
  const supportedFilesType = /.docx|.pdf/;
  if (!supportedFilesType.test(path.extname(file.name))) {
    return next(new ExceptionHandler("Please upload docx or pdf file", 400));
  }

  // Check document size
  if (file.size > process.env.MAX_FILE_SIZE) {
    return next(new ExceptionHandler("Please upload file less than 2MB.", 400));
  }

  // Rename resume
  file.name = `${req.user.name.replace(" ", "_")}_${job._id}${
    path.parse(file.name).ext
  }`;

  file.mv(`${process.env.UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.log(err);
      return next(new ExceptionHandler("Resume upload failed", 500));
    }

    await JobModel.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          applicantsApplied: { id: req.user.id, resume: file.name },
        },
      },
      { new: true, runValidators: true, userFindAndModify: false }
    );
  });

  res.status(200).json({
    success: true,
    message: "Applied job successfully",
    data: file.name,
  });
});
