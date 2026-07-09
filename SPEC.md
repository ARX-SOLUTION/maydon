# Maydon Booking — Texnik Spetsifikatsiya (SPEC)

Telegram bot + Mini App orqali bitta futbol maydonining jadvalini boshqarish tizimi.

## 1. Umumiy ko'rinish
- Bitta maydon. 
- Oqim: user bo'sh vaqtlarni ko'radi → diapazon tanlab so'rov yuboradi → admin bot orqali xabar oladi → tasdiqlaydi/rad etadi.
- Navbat adolati: bitta diapazonga bir nechta so'rov kelsa, FIFO.
- Narx/to'lov yo'q. Tizim sof jadval.

## 2. Texnologiya to'plami
- Runtime: Deno (Deno Deploy)
- HTTP framework: Hono
- Bot: grammY
- Storage: Deno KV
- UI: Hono SSR + HTMX (Adapted based on earlier CRM setup for speed and lightness)
- Auth: Telegram initData

## 3. Vaqt modeli
- Erkin diapazon: Google Calendar uslubida.
- Snap: 30 daqiqa
- Minimal davomiylik: 1 soat
- Maksimal davomiylik: 3 soat
- Ish vaqti: settings (default: 08:00–23:00)
- Gorizont: 7 kun
- Timezone: Asia/Tashkent (UTC+5)

## 4. Holatlar
pending -> confirmed -> completed/cancelled
pending -> rejected / expired

## 5. Biznes qoidalari
- User bir vaqtda maks 3 ta pending ushlab turadi.
- Bitta diapazonga bitta user faqat 1 ta so'rov yuboradi.
- Blocked users can't request.

## 6. Mini App Ekranlari
**User:**
1. Hafta ko'rinishi
2. Kun ko'rinishi
3. Mening so'rovlarim

**Admin:**
4. So'rovlar
5. Jadval + qo'lda bron
6. Recurring
7. Sozlamalar
