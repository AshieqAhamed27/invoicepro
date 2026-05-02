# InvoicePro Backend Docker

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
```
