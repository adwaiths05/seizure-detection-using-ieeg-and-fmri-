"""
Simple in-memory rate limiter (per IP, sliding window).
For production use Redis-backed limiter (e.g. slowapi).
"""

import time
from collections import defaultdict, deque

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = self._requests[ip]

        # Drop timestamps outside the window
        while window and window[0] < now - self.window_seconds:
            window.popleft()

        if len(window) >= self.max_requests:
            return Response(
                content='{"error":"Rate limit exceeded. Retry after 60s."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )

        window.append(now)
        return await call_next(request)
