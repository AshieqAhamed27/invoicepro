const express = require('express');
const multer = require('multer');
const CloudDocument = require('../models/CloudDocument');
const { protect } = require('../middleware/auth');
const {
    cloudinary,
    configureCloudinary,
    hasCloudinaryConfig,
    uploadBufferToCloudinary
} = require('../utils/cloudinary');

const router = express.Router();

const allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml'
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            const error = new Error('Only PDF, JPG, PNG, WEBP, and SVG files are allowed.');
            error.status = 400;
            return cb(error);
        }

        cb(null, true);
    }
});

const getResourceTypeForDestroy = (document) => {
    if (document.cloudinaryResourceType && document.cloudinaryResourceType !== 'auto') {
        return document.cloudinaryResourceType;
    }

    if (String(document.mimeType || '').startsWith('image/')) return 'image';
    return 'raw';
};

router.use(protect);

router.get('/status', (req, res) => {
    res.json({
        configured: hasCloudinaryConfig(),
        maxFileSizeMb: 10,
        allowedTypes: Array.from(allowedMimeTypes)
    });
});

router.get('/', async (req, res, next) => {
    try {
        const documents = await CloudDocument.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ documents });
    } catch (error) {
        next(error);
    }
});

router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        if (!hasCloudinaryConfig()) {
            return res.status(503).json({
                message: 'Cloud storage is not configured. Add Cloudinary values in backend environment variables.'
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please choose a file to upload.' });
        }

        const title = String(req.body.title || req.file.originalname || '').trim();
        if (!title) {
            return res.status(400).json({ message: 'Document title is required.' });
        }

        const folder = `clientflow-ai/cloud-documents/${req.user._id}`;
        const result = await uploadBufferToCloudinary(req.file.buffer, {
            folder,
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true
        });

        const document = await CloudDocument.create({
            user: req.user._id,
            title,
            category: req.body.category || 'other',
            note: req.body.note || '',
            linkedType: req.body.linkedType || 'none',
            linkedId: req.body.linkedId || '',
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            bytes: req.file.size,
            cloudinaryPublicId: result.public_id,
            cloudinaryResourceType: result.resource_type || 'auto',
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format || ''
        });

        res.status(201).json({ document });
    } catch (error) {
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File is too large. Maximum size is 10MB.' });
        }

        next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const document = await CloudDocument.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!document) {
            return res.status(404).json({ message: 'Cloud document not found.' });
        }

        if (hasCloudinaryConfig()) {
            configureCloudinary();
            try {
                await cloudinary.uploader.destroy(document.cloudinaryPublicId, {
                    resource_type: getResourceTypeForDestroy(document)
                });
            } catch (cloudError) {
                console.warn('Cloudinary delete warning:', cloudError.message);
            }
        }

        await document.deleteOne();
        res.json({ message: 'Document deleted.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
