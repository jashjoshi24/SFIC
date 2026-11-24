
const express = require("express");
const multer = require("multer");

const {
    analyseImageController
} = require("../controllers/imageScanController");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only PNG, JPG and WebP images are supported.")
            );
        }

        callback(null, true);
    }
});

router.post(
    "/",
    (req, res, next) => {
        upload.single("image")(req, res, error => {
            if (error instanceof multer.MulterError) {
                const status = error.code === "LIMIT_FILE_SIZE"
                    ? 413
                    : 400;

                return res.status(status).json({
                    success: false,
                    message: error.code === "LIMIT_FILE_SIZE"
                        ? "Image exceeds the 15 MB limit."
                        : "Unable to receive the uploaded image."
                });
            }

            if (error) {
                return res.status(415).json({
                    success: false,
                    message: error.message
                });
            }

            next();
        });
    },
    analyseImageController
);

module.exports = router;
