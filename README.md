# بريد عرجون

منصة خدمات عربية بنظام أحادي: Django وDRF على PostgreSQL، وNext.js داخل المشروع نفسه في `frontend/`. الخادم الأمامي هو المنفذ العام ويمرّر `/api` إلى Django الداخلي.

- [خطة التنفيذ الكاملة](IMPLEMENTATION_PLAN.md): المتطلبات والمراحل وحالة الإنجاز.
- [البنية](docs/architecture.md)، [نموذج البيانات](docs/data-model.md)، [عقد API](docs/api-contract.md)، [سجل القرارات](docs/decisions.md).

## المتطلبات

Python 3.13 أو أحدث، Node 22 أو أحدث، PostgreSQL 16.

## الإعداد المحلي

```bash
cp .env.example .env
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
(cd frontend && npm install)
createdb arjoon
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createcachetable
```

ضع في `.env` قيمًا عشوائية لـ `DJANGO_SECRET_KEY` و`INTERNAL_SECRET`. عدّل `SITE_URL` و`TRUSTED_ORIGINS` إلى `http://127.0.0.1:3108`.

أنشئ حساب المدير الأول. تُقرأ كلمة المرور من المتغير أو تُطلب تفاعليًا، ولا تُكتب في الكود:

```bash
.venv/bin/python manage.py create_staff you@example.com "اسمك" --role admin
```

خدمات تجريبية اختيارية للتطوير فقط:

```bash
.venv/bin/python manage.py seed_demo
```

## التشغيل

للتطوير، يشغّل Django على 8108 وNext على 3108:

```bash
scripts/dev.sh
```

افتح http://127.0.0.1:3108 للموقع و http://127.0.0.1:3108/admin للوحة التحكم.

لمحاكاة الإنتاج محليًا بعد البناء:

```bash
(cd frontend && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public)
scripts/local-prod.sh
```

## الاختبارات

```bash
.venv/bin/python manage.py test --settings=config.settings.test
(cd frontend && npm run typecheck)
```

## ما يعمل الآن

- الموقع: الرئيسية والخدمات وتفاصيل الخدمة ونموذج الطلب والنجاح والمتابعة والتواصل، مرندرة على الخادم مع SEO.
- الإدارة: الدخول بـ JWT، نظرة عامة، الطلبات مع التصفية والإسناد والحالات والملاحظات والسجل، الخدمات والمجالات والنماذج، الرسائل، الإعدادات والأسئلة الشائعة، الفريق.
- الصلاحيات: مدير، مشغّل، منفذ يرى المسند إليه فقط. كلها مطبقة على الخادم.

## ما لم يُنفّذ بعد

المرفقات والوسائط، التسعير والدفع، تنبيهات البريد، الصفحات المخصصة والتنقل وإدارة الحالات من الواجهة، النسخ الاحتياطي، والنشر على Render. المعاينة الأصلية لهذه الشاشات محفوظة كمرجع على `/design-preview` عند ضبط `ENABLE_DESIGN_PREVIEW=1`، وبياناتها محلية في المتصفح فقط.

## النشر

`render.yaml` و`build.sh` و`start.sh` جاهزة لخدمة Render واحدة مع PostgreSQL وقرص 10 GB، لكنها لم تُجرَّب على Render بعد. راجع الخطط والأسعار قبل التطبيق.
