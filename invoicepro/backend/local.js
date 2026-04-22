const app = require('./server');

app.startServer().catch((err) => {
    console.error('Server startup error:', err.message);
    process.exit(1);
});
