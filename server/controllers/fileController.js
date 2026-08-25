const multer = require("multer");
const {
  findProfileImage,
  openProfileImageDownloadStream,
  parseProfileImageId,
  storeProfileImage,
} = require("../services/profileImageStorage");

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Multer middleware that validates and buffers one profile image upload. */
const upload = multer({
  storage: multer.memoryStorage(),
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

/** Stores an authenticated profile image and returns its app-owned URL. */
const uploadFile = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  try {
    const { fileId } = await storeProfileImage({
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      ownerId: req.user._id,
    });
    const url = `${req.protocol}://${req.get("host")}/api/file/${fileId}`;

    return res.status(201).json({
      success: true,
      url,
    });
  } catch (error) {
    return next(error);
  }
};

/** Streams a stored profile image with safe response metadata and caching. */
const getUploadedFile = async (req, res, next) => {
  const fileId = parseProfileImageId(req.params.fileId);

  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: "Invalid file identifier",
    });
  }

  try {
    const file = await findProfileImage(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const contentType =
      file.metadata?.contentType || file.contentType || "application/octet-stream";

    res.set({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(file.length),
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    const downloadStream = openProfileImageDownloadStream(fileId);

    downloadStream.once("error", (error) => {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }

      next(error);
    });
    downloadStream.pipe(res);
    return undefined;
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUploadedFile,
  upload,
  uploadFile,
};
