const cloudinary = require('cloudinary').v2;

const hasCloudinaryConfig = () =>
    Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

const configureCloudinary = () => {
    if (!hasCloudinaryConfig()) return false;

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });

    return true;
};

const uploadBufferToCloudinary = (buffer, options = {}) => {
    configureCloudinary();

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                ...options
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(buffer);
    });
};

module.exports = {
    cloudinary,
    configureCloudinary,
    hasCloudinaryConfig,
    uploadBufferToCloudinary
};
