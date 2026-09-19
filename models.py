from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Photo(db.Model):
    __tablename__ = "photos"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(40), unique=True, nullable=False, index=True)

    image_url = db.Column(db.String(500), nullable=False)
    image_public_id = db.Column(db.String(200))  # Cloudinary id, for deletion/reports

    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    country_code = db.Column(db.String(2), index=True)
    city = db.Column(db.String(100))

    title = db.Column(db.String(80))
    caption = db.Column(db.String(220))
    uploader_name = db.Column(db.String(60))

    views = db.Column(db.Integer, default=0, nullable=False)
    likes = db.Column(db.Integer, default=0, nullable=False)
    reports = db.Column(db.Integer, default=0, nullable=False)
    hidden = db.Column(db.Boolean, default=False, nullable=False)

    ip_hash = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "image_url": self.image_url,
            "lat": self.lat,
            "lng": self.lng,
            "country_code": self.country_code,
            "city": self.city,
            "title": self.title,
            "caption": self.caption,
            "uploader_name": self.uploader_name or "زائر",
            "views": self.views,
            "likes": self.likes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
