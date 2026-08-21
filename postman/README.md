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
88 endpoint موزعين على 21 مجلد مطابقين لراوتات الباك اند:
Health, Auth, Employees, Profile, Evaluations, Performance, Chatbot, Vault, Leave, Leave Types, Tasks, Emergency, Departments, Jobs, Candidates, Interviews, Branding, Referrals, Attendance, Payroll, Notifications.
