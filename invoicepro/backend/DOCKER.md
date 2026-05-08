# ClientFlow AI Backend Docker

## Local Run

From the repo root:

```bash
docker compose up --build
```

Backend will run at:

```txt
http://127.0.0.1:5000/api/health
```

## Production Notes

- Keep frontend on Vercel.
- Deploy this backend container to Render, Railway, Fly.io, DigitalOcean, or AWS.
- Keep MongoDB on MongoDB Atlas.
- Add environment variables in the hosting dashboard, not inside the Docker image.
- Never commit the real `.env` file.
- The Code Arena Docker sandbox needs a server that can run Docker containers. Keep it disabled on hosts that do not support Docker-in-Docker.

## Code Arena Docker Sandbox

The sandbox lets Team Workspace run small JavaScript, Python, or Shell snippets inside an isolated Docker container.

Enable it only on a trusted backend/runner server:

```txt
CODE_RUNNER_ENABLED=true
CODE_RUNNER_TIMEOUT_MS=5000
CODE_RUNNER_MEMORY=128m
CODE_RUNNER_CPUS=0.5
```

Security limits currently used by the runner:

- no network access inside the code container
- read-only mounted code folder
- memory, CPU, process, and timeout limits
- no Linux capabilities and no privilege escalation
- output size limit

For production, the safest setup is a separate runner service/VPS with Docker installed. Your normal API can stay on Render, and the runner can be moved to a locked-down server later.

## Required Environment Variables

```txt
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_secret
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGINS=https://your-frontend-domain.com
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5-mini
CRON_SECRET=your_long_random_secret
CODE_RUNNER_ENABLED=false
```
