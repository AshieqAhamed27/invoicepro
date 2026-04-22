const mongoose = require('mongoose');

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const rejectInvalidObjectId = (res, resource = 'resource') => {
    return res.status(400).json({
        message: `Invalid ${resource} id.`
    });
};

module.exports = {
    isValidObjectId,
    rejectInvalidObjectId
};
