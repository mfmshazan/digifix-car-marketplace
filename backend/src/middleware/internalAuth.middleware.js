// src/middleware/internalAuth.middleware.js
// Machine-to-machine auth for n8n / cron callers. Not a user JWT.

export const internalAuth = (req, res, next) => {
    const key = req.headers['x-internal-key'];
    const expected = process.env.INTERNAL_API_KEY;

    if (!expected) {
        console.error('INTERNAL_API_KEY is not configured — refusing internal request.');
        return res.status(503).json({ success: false, message: 'Internal API not configured' });
    }

    if (!key || key !== expected) {
        return res.status(401).json({ success: false, message: 'Invalid internal key' });
    }

    next();
};