const express = require("express");
const {
  getUploadedFile,
  upload,
  uploadFile,
} = require("../controllers/fileController");
const protect = require("../middleware/auth");

const router = express.Router();

// Multipart contract: one binary `file` field and no text metadata. Multer
// performs the applicable MIME-type, size, and presence validation.
router.post("/", protect, upload.single("file"), uploadFile);
router.get("/:fileId", getUploadedFile);

module.exports = router;
