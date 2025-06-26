# پروژه هیئت نوجوانان انصارالحسین (نسخه ۲)

این نسخه شامل تغییرات گسترده بر اساس نیازمندی‌های جدید است.

## فایل‌های پروژه

-   `index.html`: صفحه اصلی و فرم ثبت‌نام.
-   `panel.html`: پنل کاربری برای نمایش ساعت اتمام مراسم.
-   `admin.html`: پنل مدیریت برای مشاهده لیست ثبت‌نام‌شدگان و تنظیم ساعت اتمام مراسم.
-   `styles.css`: فایل استایل‌دهی برای ظاهر صفحات.
-   `js/config.js`: حاوی اطلاعات اتصال به پایگاه داده Supabase.
-   `js/main.js`: منطق جاوااسکریپت برای صفحات `index.html` و `panel.html`.
-   `js/admin.js`: منطق جاوااسکریپت برای صفحه `admin.html`.

---

## اقدامات لازم برای راه‌اندازی

برای اینکه وب‌سایت به درستی کار کند، لطفاً مراحل زیر را دنبال کنید:

### ۱. بازطراحی پایگاه داده

اسکریپت زیر، ساختار پایگاه داده شما را به طور کامل بازطراحی می‌کند. این اسکریپت جداول قبلی را **حذف** کرده و ساختار جدید را ایجاد می‌کند.

**مهم:** قبل از اجرا، اگر داده‌ای در جداول قبلی دارید، از آن پشتیبان تهیه کنید.

وارد **SQL Editor** در پنل Supabase خود شوید و کد زیر را به صورت کامل اجرا کنید:

```sql
-- Drop old tables if they exist
DROP TABLE IF EXISTS public.children CASCADE;
DROP TABLE IF EXISTS public.ceremony CASCADE;

-- Create 'children' table with new fields
CREATE TABLE public.children (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT now(),
  full_name TEXT NOT NULL,
  age INT,
  primary_parent_phone TEXT NOT NULL,
  secondary_parent_phone TEXT,
  medical_history TEXT,
  can_leave_unaccompanied BOOLEAN DEFAULT false
);

-- Create 'attendance' table for tracking presence
CREATE TABLE public.attendance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  child_id BIGINT REFERENCES public.children(id) ON DELETE CASCADE,
  ceremony_date DATE NOT NULL,
  UNIQUE(child_id, ceremony_date) -- Ensures a child is marked only once per day
);

-- Create 'awards' table for managing prizes
CREATE TABLE public.awards (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  child_id BIGINT REFERENCES public.children(id) ON DELETE CASCADE,
  reason TEXT,
  voucher_type TEXT,
  award_type TEXT,
  awarded_at TIMESTAMPTZ DEFAULT now()
);


-- Enable Row Level Security (RLS) for the new tables
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for now
-- Note: These will be refined later for different admin roles
CREATE POLICY "Public access for children" ON public.children
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access for attendance" ON public.attendance
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access for awards" ON public.awards
FOR ALL USING (true) WITH CHECK (true);

```

پس از اجرای این اسکریپت، ساختار پایگاه داده شما برای پیاده‌سازی قابلیت‌های جدید آماده است. در مراحل بعدی، به سراغ تغییرات در کدهای وب‌سایت خواهم رفت.

### ۲. تنظیم CORS (برای رفع خطای Failed to fetch)

برای اینکه برنامه شما بتواند از لوکال‌هاست (مثلاً آدرس `http://127.0.0.1:800`) به Supabase متصل شود، باید تنظیمات CORS را انجام دهید:

1.  وارد پنل پروژه خود در **Supabase** شوید.
2.  به بخش **Project Settings** (آیکون چرخ‌دنده) بروید.
3.  از منوی کناری، **API** را انتخاب کنید.
4.  در بخش **CORS Configuration**، آدرس `http://127.0.0.1:800` را اضافه کنید. اگر از پورت دیگری استفاده می‌کنید، آن را وارد کنید. برای راحتی کار در محیط توسعه، می‌توانید از `*` (ستاره) استفاده کنید، اما این کار در محیط پروداکشن توصیه **نمی‌شود**.

پس از انجام این تنظیمات، خطای `Failed to fetch` باید برطرف شود.

### ۳. امنیت پنل مدیریت

رمز عبور پیش‌فرض برای ورود به پنل مدیریت، `admin` است. این رمز **بسیار ناامن** است و باید فوراً تغییر کند.

1.  فایل `js/admin.js` را باز کنید.
2.  در خط پنجم، مقدار متغیر `ADMIN_PASSWORD` را به یک رمز عبور قوی و جدید تغییر دهید:

    ```javascript
    const ADMIN_PASSWORD = 'YOUR_NEW_STRONG_PASSWORD'; // رمز جدید خود را اینجا وارد کنید
    ```

---

## نحوه استفاده

-   برای تست، فایل `index.html` را در مرورگر خود باز کنید.
-   برای ورود به پنل مدیریت، به آدرس `admin.html` بروید و رمزی که در مرحله قبل تنظیم کردید را وارد نمایید.

موفق باشید! 