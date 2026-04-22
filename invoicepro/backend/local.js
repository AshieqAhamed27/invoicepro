const app = require('./server');

app.startServer({ entrypoint: 'local.js' }).catch((err) => {
    console.error('Server startup error:', err.message);
    process.exit(1);
});
