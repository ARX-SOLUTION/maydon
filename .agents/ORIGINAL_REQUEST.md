# Original User Request

## Initial Request — 2026-07-10T00:44:55Z

# Teamwork Project Prompt — Draft

O'zgarishlarni chuqur tekshirish (deep code review va audit) hamda TDD (Test-Driven Development) yordamida sifatini ta'minlash. Asosiy e'tibor **band qilish (booking)** jarayoniga tegishli fayllar va mantiqqa qaratiladi. Kodning standartlarga mosligini va loyiha talablariga (Spec: `implementation_plan.md`) mos ravishda yozilganini parallel ravishda tekshirib, xatoliklar avtomatik ravishda to'g'irlanadi (Auto-fix) va yetishmayotgan testlar yoziladi.

Working directory: `/Users/admin/Developer/Projects/maydon`
Integrity mode: development

## Requirements

### R1. Booking mantiqini tekshirish (Spec & Standards Review)
Band qilish (booking) tizimiga aloqador barcha o'zgarishlar (xususan, UI, API va xizmat qatlamlari, masalan: `src/api/user.ts`, `src/ui/components/BookCard.tsx`, va h.k.) `code-review` shabloni asosida chuqur tahlil qilinishi kerak. `implementation_plan.md` dagi talablardan chiqib ketmaganligini va "Code Smell" lar mevjud emasligini ta'minlang. 

### R2. Refaktor va TDD (Auto-fix)
Koddagi xatoliklar, xunuk yozilgan qismlar ("smells") aniqlansa, ular shu zahoti refaktor qilinishi kerak. Band qilish (booking) mantig'iga doir barcha funksiyalar (va API marshrutlari) uchun TDD (Test-Driven Development) tamoyili bo'yicha mustahkam (robust) unit yoki integratsion testlar yaratilishi zarur. 

### R3. Bekor qilish (Cancellation/No-show) tizimi (Yangi Talab)
Adminlarga oldin tasdiqlangan (confirmed) o'yinlarni "Bekor qilish" (Cancel) imkoniyatini qo'shish. Bekor qilingan o'yin bazadan o'chirilmaydi, balki uning statusi `cancelled` ga o'zgaradi. Bu kelajakda qaysi mijozlar o'yinga kelmaganligini (no-show) kuzatish imkonini beradi. Bunga tegishli UI tugmalari (faqat adminlar uchun) va server funksiyalari (API va Service) qo'shilib, ularga ham testlar yozilishi shart.

### R4. Deno Infrastrukturasi
Barcha testlar va tiplarni tekshirish qat'iy ravishda `deno task test` va `deno check src/main.ts` orqali amalga oshirilishi kerak. Tizim ishlamaydigan holatda (broken state) qolib ketmasligi shart.

## Acceptance Criteria

### Verification & Testing
- [ ] O'zgartirilgan va yangi qo'shilgan barcha booking fayllari uchun testlar mavjud bo'lishi kerak.
- [ ] Loyihadagi barcha testlar `deno task test` buyrug'i orqali xatosiz (100% passed) o'tishi kerak.
- [ ] `deno check src/main.ts` orqali tizimning barcha tiplari xatosiz kompilyatsiya bo'lishi kerak.
- [ ] Yakunda `review_report.md` nomli hujjat (Artifact) yaratilib, unda Standartlar va Spec o'qlari bo'yicha topilgan kamchiliklar va ular qanday to'g'irlangani yozilishi kerak.
