# Video Platform

This project is a simple Node.js/Express backend with a static frontend.

## Run locally

```bash
npm install
node server.js
```

Then open `http://localhost:3000` in your browser.

## Deploy to a Node host

1. Push this repository to GitHub.
2. Use a Node deployment service such as Render, Railway, or Fly.
3. Set the start command to:

```bash
node server.js
```

The server uses `process.env.PORT || 3000`, so the host-assigned port will work.

## Notes

- `uploads/` is used for uploaded video files.
- `db.json` stores fallback data when MongoDB is not available.
- You can deploy this as a single Node app serving both the frontend and backend.
