const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
const geoCoder = require("../utils/geocoder");

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please enter Job title"],
    trim: true,
    maxlength: [100, "Job title can not exceed 100 characters"],
  },
  slug: String,
  description: {
    type: String,
    required: [true, "Please enter job description"],
    maxlength: [1000, "Job description could not exeed 1000 characters"],
  },
  email: {
    type: String,
    validate: [validator.isEmail, "Please add a valid email address"],
  },
  address: {
    type: String,
    required: [true, "Please add an address"],
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number],
      index: "2dsphere",
    },
    formattedAddress: String,
    city: String,
    state: String,
    zipcode: String,
    country: String,
  },
  company: {
    type: String,
    required: [true, "Please add company name"],
  },
  industry: {
    type: [String],
    required: true,
    enum: {
      values: [
        "Business",
        "Information Technology",
        "Banking",
        "Education/Training",
        "Telecomunication",
      ],
      message: "Please select correct options for industry.",
    },
  },
  jobType: {
    type: String,
    required: true,
    enum: {
      values: ["Full-Time", "Part-Time"],
      message: "Please choose correct options for job type.",
    },
  },
  minEducation: {
    type: String,
    required: true,
    enum: {
      values: ["Bachelors", "Masters", "Phd"],
      message: "Please select correct options for education",
    },
  },
  positions: {
    type: Number,
    default: 1,
  },
  experience: {
    type: String,
    required: true,
    enum: {
      values: [
        "Entry level",
        "1 Year",
        "2 Years",
        "3 Years",
        "4 Years",
        "5 Years +",
      ],
      message: "Please select correct options for Experience",
    },
  },
  salary: {
    type: Number,
    required: [true, "Please enter expected salary for this job"],
  },
  postingDate: {
    type: Date,
    default: Date.now(),
  },
  lastDate: {
    type: Date,
    default: new Date().setDate(new Date().getDate() + 7),
  },
  applicantsApplied: {
    type: [Object],
    select: false,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
});

jobSchema.pre("save", async function (next) {
  //Create slug before saving document to DB
  this.slug = slugify(this.title, { lower: true });

  const location = await geoCoder.geocode(this.address);

  console.log(location);

  this.location = {
    type: "Point",
    coordinates: [location[0].longitude, location[0].latitude],
    formattedAddress: location[0].formattedAddress,
    city: location[0].city,
    state: location[0].stateCode,
    zipcode: location[0].zipcode,
    country: location[0].countryCode,
  };
  next();
});

module.exports = mongoose.model("Job", jobSchema);
