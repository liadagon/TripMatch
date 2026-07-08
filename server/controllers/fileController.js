const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.join(__dirname, "../public"));
  },
  filename: (req, file, callback) => {
    const fileExtension = path.extname(file.originalname);
    const fileName = Date.now() + fileExtension;

    callback(null, fileName);
  },
});

const upload = multer({ storage });

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const domainBase = process.env.DOMAIN_BASE || "127.0.0.1";
  const port = process.env.PORT || 5000;
  const url = `http://${domainBase}:${port}/public/${req.file.filename}`;

  return res.status(201).json({
    success: true,
    url,
  });
};

module.exports = {
  upload,
  uploadFile,
};
