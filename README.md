# Forst Earth

كرة أرضية ثلاثية الأبعاد، كل نقطة عليها صورة رفعها شخص من مكانه. بدون حسابات، بدون تسجيل دخول.

بُني بـ Flask + Three.js + Cloudinary + PostgreSQL — كل الخدمات مجانية.

---

## 1) التشغيل محليًا (بدون أي حساب، يشتغل بقاعدة SQLite تلقائيًا)

```bash
python -m venv venv
source venv/bin/activate        # على ويندوز: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

افتح المتصفح على `http://localhost:5000`.

> بدون بيانات Cloudinary، رفع الصور راح يفشل. سوّي حساب Cloidinary مجاني (الخطوة 2) عشان الرفع يشتغل حتى محليًا.

---

## 2) إنشاء حساب Cloudinary مجاني (لتخزين الصور — 25 جيجا مجانًا)

1. روح [cloudinary.com](https://cloudinary.com) وسوّي حساب مجاني.
2. من لوحة التحكم (Dashboard) انسخ:
   - `Cloud name`
   - `API Key`
   - `API Secret`
3. حطهم في ملف `.env` (محليًا) أو في متغيرات البيئة على Render (الخطوة 3).

---

## 3) نشر الموقع مجانًا على Render

1. ارفع هذا المجلد كمستودع على GitHub.
2. روح [render.com](https://render.com) وسوّي حساب (يقدر تربطه بحساب GitHub مباشرة).
3. اختر **New → Blueprint**، واختر المستودع. Render بيقرأ ملف `render.yaml` تلقائيًا وينشئ:
   - خدمة ويب (الموقع نفسه) على الخطة المجانية
   - قاعدة بيانات PostgreSQL مجانية (تبقى مجانية أول 90 يوم، بعدها لازم تربط بطاقة أو تنقلها لخطة أخرى — هذا قيد من Render نفسه)
4. بعد الإنشاء، روح لإعدادات خدمة الويب → **Environment**، وأضف القيم الثلاث من Cloudinary:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. اضغط **Manual Deploy** إذا ما بدأ النشر تلقائيًا. خلال دقائق، موقعك حي على رابط مثل:
   `https://forst-earth.onrender.com`

> ملاحظة عن الخطة المجانية في Render: الخدمة تنام بعد فترة عدم استخدام وتاخذ ثوانٍ للرجوع عند أول زيارة — هذا طبيعي في الخطة المجانية وما يأثر على البيانات.

---

## 4) ربط دومين خاص (اختياري، ومجاني إذا عندك الدومين أصلًا)

من إعدادات الخدمة في Render → **Settings → Custom Domain**، أضف الدومين ووجّه الـ DNS حسب التعليمات اللي بتظهر لك.

---

## هيكلة المشروع

```
app.py              نقاط النهاية (routes) الرئيسية
models.py            جدول الصور في قاعدة البيانات
countries_data.py     قائمة الدول وإحداثياتها
utils.py              فلتر الكلمات، توليد الروابط، تشفير الـ IP
templates/            صفحات HTML (Jinja2)
static/css/style.css   التصميم الكامل
static/js/globe-core.js  محرك الكرة الأرضية (Three.js)
static/js/globe.js       منطق الصفحة الرئيسية
static/js/upload.js      منطق صفحة الرفع + منتقي الموقع
static/js/photo.js       إعجاب / إبلاغ / نسخ رابط
```

## تعديل الشعار

الشعار الحالي مربوط برابط خارجي في `config.py` (`SITE_LOGO_URL`). لو تبي ترفعه كملف داخل المشروع بدل الرابط، حطه في `static/img/logo.png` وغيّر القيمة إلى:

```python
SITE_LOGO_URL = "/static/img/logo.png"
```

## القيود الحالية (v1)

- صور فقط (لا فيديو ولا صوت).
- لا يوجد تسجيل دخول — الحماية من السبام تعتمد على تحديد عدد الرفعات لكل IP (٥ صور بالساعة) وفلتر كلمات بسيط.
- الإبلاغات: أي صورة توصل ٥ بلاغات تنخفي تلقائيًا لحين المراجعة اليدوية من قاعدة البيانات.
