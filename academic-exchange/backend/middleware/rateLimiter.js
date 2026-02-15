// Rate Limiting Middleware
const rateLimit = {};

function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!rateLimit[ip]) {
            rateLimit[ip] = { count: 1, startTime: now };
            return next();
        }

        const timeElapsed = now - rateLimit[ip].startTime;

        if (timeElapsed > windowMs) {
            // Reset window
            rateLimit[ip] = { count: 1, startTime: now };
            return next();
        }

        if (rateLimit[ip].count >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((windowMs - timeElapsed) / 1000)
            });
        }

        rateLimit[ip].count++;
        next();
    };
}

// Cleanup old entries every hour
setInterval(() => {
    const now = Date.now();
    Object.keys(rateLimit).forEach(ip => {
        if (now - rateLimit[ip].startTime > 60 * 60 * 1000) {
            delete rateLimit[ip];
        }
    });
}, 60 * 60 * 1000);

module.exports = rateLimiter;
