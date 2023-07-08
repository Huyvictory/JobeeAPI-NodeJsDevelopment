const express = require("express");
const router = express.Router();

const {
  getUserProfile,
  updatePassword,
  updateUser,
  deleteUser,
  getAppliedJobs,
  getPublishedJobs,
  getUsers,
  adminDeleteUser,
} = require("../controllers/userController");
const { isAuthenticatedUser, authorizeRoles } = require("../middlewares/auth");

// All route must be authenticated by user  to be in use
router.use(isAuthenticatedUser);

router.route("/me").get(getUserProfile);
router.route("/job/applied").get(authorizeRoles("user"), getAppliedJobs);

router
  .route("/jobs/published")
  .get(authorizeRoles("employer", "admin"), getPublishedJobs);

router.route("/password-change").put(updatePassword);
router.route("/me/update").put(updateUser);

router.route("/me/delete").delete(deleteUser);

// Admin only routes
router.route("/users").get(authorizeRoles("admin"), getUsers);

router.route("/users/:id").delete(authorizeRoles("admin"), adminDeleteUser);

module.exports = router;
