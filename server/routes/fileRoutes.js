const express = require("express");
const {
  getUploadedFile,
  upload,
  uploadFile,
} = require("../controllers/fileController");
const protect = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, upload.single("file"), uploadFile);
router.get("/:fileId", getUploadedFile);

module.exports = router;
