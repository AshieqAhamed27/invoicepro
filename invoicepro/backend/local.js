const app = require('./server');
const { getRequiredEnv } = require('./utils/env');

const startServer = async() => {
    const PORT = process.env.PORT || 5000;

    try {
        getRequiredEnv('JWT_SECRET');
        await app.connectDatabase();
        console.log('Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Server startup error:', err.message);
        process.exit(1);
    }
};

startServer();
