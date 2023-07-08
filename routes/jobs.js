const express = require("express");
const router = express.Router();

// Importing controller methods related job module
const {
  getListJobs,
  newJob,
  getJobsInRadius,
  updateJob,
  deleteJob,
  getJobIdSlug,
  getJobStatistics,
  applyJob,
} = require("../controllers/jobsController");

const { isAuthenticatedUser, authorizeRoles } = require("../middlewares/auth");

//GET
router.route("/job/:id/:slug").get(getJobIdSlug);
router.route("/jobs").get(getListJobs);
router.route("/jobs/:zipcode/:distance").get(getJobsInRadius);
router.route("/jobs/stats/:id/:topic").get(getJobStatistics);

//POST
router
  .route("/job/new")
  .post(isAuthenticatedUser, authorizeRoles("employer", "admin"), newJob);

//PUT & DELETE
router
  .route("/job/:id")
  .put(isAuthenticatedUser, authorizeRoles("employer", "admin"), updateJob)
  .delete(isAuthenticatedUser, authorizeRoles("employer", "admin"), deleteJob);

router
  .route("/job/:id/apply")
  .put(isAuthenticatedUser, authorizeRoles("user"), applyJob);

module.exports = router;
