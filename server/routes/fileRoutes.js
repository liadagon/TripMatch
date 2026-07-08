const express = require("express");
const { upload, uploadFile } = require("../controllers/fileController");

const router = express.Router();

router.post("/", upload.single("file"), uploadFile);

module.exports = router;
