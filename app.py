import json
import random
from datetime import datetime, timedelta

import cloudinary
import cloudinary.uploader
from flask import Flask, render_template, request, jsonify, redirect, url_for, abort, make_response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import func

from config import Config
from models import db, Photo
from countries_data import COUNTRIES, COUNTRY_BY_CODE
from utils import contains_banned_word, make_slug, hash_ip, client_ip

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

cloudinary.config(
    cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
    api_key=app.config["CLOUDINARY_API_KEY"],
    api_secret=app.config["CLOUDINARY_API_SECRET"],
    secure=True,
)

limiter = Limiter(get_remote_address, app=app, storage_uri="memory://")


COUNTRY_NAMES_JSON = json.dumps({c[0]: c[1] for c in COUNTRIES}, ensure_ascii=False)


@app.context_processor
def inject_globals():
    return {
        "site_name": app.config["SITE_NAME"],
        "logo_url": app.config["SITE_LOGO_URL"],
        "current_year": datetime.utcnow().year,
        "country_names_json": COUNTRY_NAMES_JSON,
    }


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


def visible_photos_query():
    return Photo.query.filter_by(hidden=False)


# ---------------------------------------------------------------- pages ----

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload")
def upload_page():
    return render_template("upload.html", countries=COUNTRIES)


@app.route("/photo/<slug>")
def photo_page(slug):
    photo = Photo.query.filter_by(slug=slug).first()
    if not photo or (photo.hidden and request.args.get("preview") != "1"):
        abort(404)

    cookie_name = f"seen_{photo.slug}"
    resp_needs_cookie = request.cookies.get(cookie_name) is None
    if resp_needs_cookie:
        photo.views += 1
        db.session.commit()

    country = COUNTRY_BY_CODE.get(photo.country_code)
    resp = make_response(render_template("photo.html", photo=photo, country=country))
    if resp_needs_cookie:
        resp.set_cookie(cookie_name, "1", max_age=60 * 60 * 24 * 365)
    return resp


@app.route("/country/<code>")
def country_page(code):
    code = code.upper()
    country = COUNTRY_BY_CODE.get(code)
    if not country:
        abort(404)
    photos = (
        visible_photos_query()
        .filter_by(country_code=code)
        .order_by(Photo.created_at.desc())
        .all()
    )
    return render_template("country.html", country=country, photos=photos)


@app.route("/countries")
def countries_list():
    counts = dict(
        db.session.query(Photo.country_code, func.count(Photo.id))
        .filter_by(hidden=False)
        .group_by(Photo.country_code)
        .all()
    )
    rows = [
        {"code": c[0], "name_ar": c[1], "name_en": c[2], "count": counts.get(c[0], 0)}
        for c in COUNTRIES
        if c[0] != "XX"
    ]
    rows.sort(key=lambda r: r["count"], reverse=True)
    return render_template("countries.html", rows=rows)


@app.route("/top")
def top_page():
    period = request.args.get("period", "all")
    sort = request.args.get("sort", "views")

    q = visible_photos_query()
    if period == "week":
        q = q.filter(Photo.created_at >= datetime.utcnow() - timedelta(days=7))
    elif period == "month":
        q = q.filter(Photo.created_at >= datetime.utcnow() - timedelta(days=30))

    if sort == "likes":
        q = q.order_by(Photo.likes.desc())
    elif sort == "new":
        q = q.order_by(Photo.created_at.desc())
    else:
        sort = "views"
        q = q.order_by(Photo.views.desc())

    photos = q.limit(50).all()
    return render_template("top.html", photos=photos, period=period, sort=sort)


@app.route("/about")
def about_page():
    return render_template("about.html")


@app.route("/random")
def random_photo():
    ids = [p.id for p in visible_photos_query().with_entities(Photo.id).all()]
    if not ids:
        return redirect(url_for("index"))
    photo = Photo.query.get(random.choice(ids))
    return redirect(url_for("photo_page", slug=photo.slug))


@app.route("/search")
def search_page():
    q = request.args.get("q", "").strip()
    results = []
    if q:
        needle = q.lower()
        matched_codes = [
            c[0] for c in COUNTRIES
            if needle in c[1].lower() or needle in c[2].lower()
        ]
        results = (
            visible_photos_query()
            .filter(
                db.or_(
                    Photo.country_code.in_(matched_codes) if matched_codes else False,
                    Photo.city.ilike(f"%{q}%"),
                )
            )
            .order_by(Photo.created_at.desc())
            .limit(60)
            .all()
        )
    return render_template("search.html", q=q, results=results)


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html"), 404


# ------------------------------------------------------------------ api ----

@app.route("/api/photos")
def api_photos():
    country = request.args.get("country")
    q = visible_photos_query()
    if country:
        q = q.filter_by(country_code=country.upper())
    photos = q.order_by(Photo.created_at.desc()).limit(2000).all()
    return jsonify([p.to_dict() for p in photos])


@app.route("/api/upload", methods=["POST"])
@limiter.limit(Config.UPLOAD_RATE_LIMIT)
def api_upload():
    file = request.files.get("image")
    if not file or file.filename == "":
        return jsonify({"ok": False, "error": "لم يتم اختيار صورة"}), 400
    if not allowed_file(file.filename):
        return jsonify({"ok": False, "error": "صيغة الصورة غير مدعومة"}), 400

    try:
        lat = float(request.form.get("lat", ""))
        lng = float(request.form.get("lng", ""))
    except ValueError:
        return jsonify({"ok": False, "error": "حدد الموقع على الكرة الأرضية"}), 400
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return jsonify({"ok": False, "error": "إحداثيات غير صحيحة"}), 400

    country_code = (request.form.get("country") or "XX").upper()
    if country_code not in COUNTRY_BY_CODE:
        country_code = "XX"
    city = (request.form.get("city") or "").strip()[:100]
    title = (request.form.get("title") or "").strip()[: Config.TITLE_MAX_LEN]
    caption = (request.form.get("caption") or "").strip()[: Config.CAPTION_MAX_LEN]
    uploader_name = (request.form.get("name") or "").strip()[: Config.NAME_MAX_LEN]

    if not uploader_name:
        return jsonify({"ok": False, "error": "الاسم مطلوب"}), 400
    if contains_banned_word(title) or contains_banned_word(caption) or contains_banned_word(uploader_name):
        return jsonify({"ok": False, "error": "النص يحتوي على كلمات غير مسموحة"}), 400

    try:
        result = cloudinary.uploader.upload(
            file,
            folder="forst-earth",
            resource_type="image",
            transformation=[{"width": 1600, "height": 1600, "crop": "limit", "quality": "auto"}],
        )
    except Exception as exc:  # noqa: BLE001 - surface upload failures to the client
        return jsonify({"ok": False, "error": f"تعذر رفع الصورة: {exc}"}), 502

    slug = make_slug()
    while Photo.query.filter_by(slug=slug).first():
        slug = make_slug()

    photo = Photo(
        slug=slug,
        image_url=result["secure_url"],
        image_public_id=result.get("public_id"),
        lat=lat,
        lng=lng,
        country_code=country_code,
        city=city,
        title=title,
        caption=caption,
        uploader_name=uploader_name,
        ip_hash=hash_ip(client_ip(request), app.config["SECRET_KEY"]),
    )
    db.session.add(photo)
    db.session.commit()

    return jsonify({"ok": True, "slug": photo.slug, "url": url_for("photo_page", slug=photo.slug)})


@app.route("/api/photo/<int:photo_id>/like", methods=["POST"])
def api_like(photo_id):
    photo = Photo.query.get_or_404(photo_id)
    photo.likes += 1
    db.session.commit()
    return jsonify({"ok": True, "likes": photo.likes})


@app.route("/api/photo/<int:photo_id>/report", methods=["POST"])
def api_report(photo_id):
    photo = Photo.query.get_or_404(photo_id)
    photo.reports += 1
    if photo.reports >= 5:
        photo.hidden = True
    db.session.commit()
    return jsonify({"ok": True})


with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
