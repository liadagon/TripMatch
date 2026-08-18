const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.join(__dirname, "../public"));
  },
  filename: (req, file, callback) => {
    const extensionByMimeType = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extensionByMimeType[file.mimetype]}`;

    callback(null, fileName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error("Only image files are allowed");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const url = `${req.protocol}://${req.get("host")}/public/${req.file.filename}`;

  return res.status(201).json({
    success: true,
    url,
  });
};

module.exports = {
  upload,
  uploadFile,
};
