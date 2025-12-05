// backend/routes/privateRequestRoutes.js
const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../middleware/AuthMiddleware");
const {
  createPrivateRequest,
  listPrivateRequestsForUser,
  getPrivateRequestForUser,
  updatePrivateRequestStatus,
} = require("../controllers/privateRequestController");

router.post("/", AuthMiddleware, createPrivateRequest);
router.get("/", AuthMiddleware, listPrivateRequestsForUser);
router.get("/:id", AuthMiddleware, getPrivateRequestForUser);
router.put("/:id/:action", AuthMiddleware, updatePrivateRequestStatus);

module.exports = router;
