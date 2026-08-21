# Postman Collection — Smart HR System

## استيراد الملفات
1. افتح Postman → Import → اختر الملفين:
   - `Smart-HR-System.postman_collection.json`
   - `Smart-HR-System.postman_environment.json`
2. فعّل environment "Smart HR System - Local" من القائمة العلوية اليمنى.
3. تأكد إن السيرفر شغال على `http://localhost:5000` (أو عدّل `base_url` في الـ environment).

## طريقة الاستخدام
- شغّل الريكوست **Auth → Login** أول شي، وفيه سكريبت تلقائي بيحفظ الـ `token` بالـ environment، وكل الريكوستات الباقية بتستخدمه تلقائياً (Bearer Auth موروث من الـ collection).
- لازم تعبي المتغيرات زي `employeeId`, `departmentId`, `jobId`... الخ يدوياً بالـ environment حسب البيانات الموجودة عندك (أو من الـ response بعد ما تعمل create).
- الريكوستات يلي فيها رفع ملفات (Upload Document, Create Candidate, Attach Recording) لازم تختار الملف يدوياً من تبويب Body → form-data.

## المحتوى
102 endpoint موزعين على 24 مجلد مطابقين لراوتات الباك اند:
Health, Auth, Employees, Profile, Evaluations, Performance, Chatbot, Vault, Leave, Leave Types, Tasks, Emergency, Departments, Jobs, Candidates, Interviews, Branding, Referrals, Attendance, Payroll, Notifications, Dashboard, Reports, Audit Logs.

## ملاحظات حسب اليوزر ستوريز
- **Dashboard** (US-009): إحصائيات حضور اليوم، طلبات إجازة معلّقة، تنبيهات مستندات، ملخص رواتب الشهر، اتجاه حضور آخر 7 أيام.
- **Reports** (US-012, US-019): تقرير حضور شهري بفلترة قسم + تصدير Excel/PDF، تقرير Turnover Rate، تقرير أداء الأقسام + تصدير.
- **Audit Logs** (US-014): كل تغيير على دور مستخدم (عبر Employees → Change Role) بينسجل هون.
- **Payroll**: فيه احتساب تلقائي من سجل الحضور (Generate Payroll) بالإضافة للإدخال اليدوي، وتحميل قسيمة الراتب كـ PDF.
- **Leave Request**: صار فيها إرفاق مستند مؤيد اختياري (attachment) — form-data بدل raw JSON.
- **Vault**: صار فيها حالة للمستند (pending_review/approved/rejected) وريكوست Review Document.
- **Candidates**: صار فيها Hire Candidate لتحويل مرشح مقبول مباشرة لموظف.
- **Interviews**: صار فيها فحص تعارض مواعيد لما تحدد scheduledAt يدوياً (409 إلا إذا force: true).
- **Notifications**: صار فيها Get/Update Preferences (inApp/email) — ملاحظة: تفضيل الإيميل بينخزن بس، ما في إرسال إيميل فعلي لأنه ما في mail service مربوط بالمشروع.
- تنبيه نسيان تسجيل الانصراف وتنبيه تكرار التأخير (US-002, US-012) بيصيرو تلقائياً عبر cron job يومي، مش endpoint مباشر — بتظهر كإشعارات بـ Notifications.
