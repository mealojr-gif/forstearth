import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "forst-earth-dev-key-change-me")

    # Render provides DATABASE_URL for its free Postgres add-on.
    # Falls back to a local SQLite file so the site also runs with zero setup.
    _db_url = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'forst.db')}")
    if _db_url.startswith("postgres://"):
        # SQLAlchemy 1.4+/2.x needs the postgresql:// scheme.
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

    SITE_NAME = "Forst Earth"
    SITE_LOGO_URL = "https://i.postimg.cc/Gm8TXGRG/IMG-0197.jpg"

    MAX_CONTENT_LENGTH = 12 * 1024 * 1024  # 12MB upload ceiling
    UPLOAD_RATE_LIMIT = "1 per 5 seconds"

    CAPTION_MAX_LEN = 200
    TITLE_MAX_LEN = 60
    NAME_MAX_LEN = 40
