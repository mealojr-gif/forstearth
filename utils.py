import hashlib
import random
import string

# Small starter list — extend freely. Keeps obvious spam/abuse words out of
# captions and titles. This is intentionally simple (no external service).
BANNED_WORDS = {
    "porn", "sex", "nude", "viagra", "casino", "bet now", "xxx",
    "قحبة", "كس", "منيك", "احتيال", "مخدرات",
}


def contains_banned_word(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(word in lowered for word in BANNED_WORDS)


def make_slug(length: int = 8) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def hash_ip(ip: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{ip}".encode("utf-8")).hexdigest()


def client_ip(request) -> str:
    # Render (and most PaaS) sit behind a proxy; the real client IP is the
    # first entry of X-Forwarded-For when present.
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "0.0.0.0"
