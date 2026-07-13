# MAYDON Admin Panel — Telegram Mini App Design Specification

> **Hujjat holati:** Advanced admin UI/UX specification  
> **Mahsulot:** MAYDON  
> **Platforma:** Telegram Mini App  
> **Qamrov:** Faqat administrator interfeysi  
> **Asosiy til:** O‘zbekcha  
> **Primary source:** mavjud MAYDON domain qoidalari, `SPEC.md`, admin API, services va testlar  
> **UI maqsadi:** administratorga so‘rovlarni tez va xavfsiz boshqarish, jadval holatini kuzatish, foydalanuvchilarni tasdiqlash, recurring bronlarni nazorat qilish, admin rollari va tizim sozlamalarini xatosiz boshqarish imkonini berish

---

# 1. Mahsulot maqsadi

MAYDON admin paneli oddiy “dashboard” emas. U kundalik operatsion boshqaruv vositasi.

Administrator quyidagi vazifalarni bajaradi:

1. Yangi bron so‘rovlarini ko‘radi.
2. So‘rovni tasdiqlaydi yoki rad etadi.
3. Qaror qabul qilishdan oldin vaqt konflikti va foydalanuvchi kontekstini tekshiradi.
4. Kunlik va haftalik jadvalni kuzatadi.
5. Tasdiqlangan bronlar va recurring bronlarni boshqaradi.
6. Yangi foydalanuvchilarni tasdiqlaydi yoki rad etadi.
7. Adminlar va ularning huquqlarini boshqaradi.
8. Ish vaqti, slot oralig‘i, davomiyliklar, timezone va notification sozlamalarini yangilaydi.
9. Muhim destructive actionlarni tasodifan bajarmaslik uchun aniq tasdiqlashdan foydalanadi.
10. Telegram ichida tez, responsive va xavfsiz ishlaydi.

Admin panelning asosiy dizayn savoli:

> **Administrator eng muhim navbatdagi vazifani bir qarashda topib, domain qoidalarini buzmasdan, minimal kontekst almashtirish bilan qaror qabul qila oladimi?**

---

# 2. Asosiy UX maqsadlari

## 2.1. Operatsion tezlik

- Pending so‘rovlar soni doim ko‘rinadi.
- Eng eski yoki eng yaqin vaqtga tegishli so‘rovlar ustuvor ko‘rsatiladi.
- Har bir so‘rov kartasida qaror uchun yetarli minimal kontekst bo‘ladi.
- Batafsil ma’lumot secondary sheet yoki detail screen’da ochiladi.
- Admin ko‘p marta ortga-forward qilishga majbur bo‘lmaydi.

## 2.2. Qaror xavfsizligi

- Approve va reject bir xil vizual vaznda ko‘rsatilmaydi.
- Approve’dan oldin backend availability qayta tekshiriladi.
- Stale request yoki conflict bo‘lsa action bloklanadi.
- Reject sababini domain talab qilsa majburiy maydon sifatida ko‘rsatish.
- Approved bronni bekor qilish destructive confirmation talab qiladi.
- Admin, settings va role o‘zgarishlari alohida confirmation talab qiladi.

## 2.3. Tushunarli prioritet

Admin birinchi ekranda quyidagilarni ko‘rishi kerak:

- Pending bron so‘rovlari.
- Tasdiqlashni kutayotgan foydalanuvchilar.
- Bugungi tasdiqlangan bronlar.
- Konflikt yoki tizim ogohlantirishlari.
- Bugungi ish vaqti yoki yopiq holat.

## 2.4. Kam visual noise

- Birinchi darajali ekranda faqat actionable itemlar.
- Archived/rejected/history defaultda yashirin.
- Complex filterlar progressive disclosure orqali.
- Jadvalda “hamma narsani” bir vaqtning o‘zida ko‘rsatmaslik.
- Rang faqat status va priority uchun.

## 2.5. Telegram native behavior

- Theme params.
- Safe-area.
- BackButton.
- MainButton.
- SettingsButton.
- HapticFeedback.
- showPopup.
- Browser preview fallback.

---

# 3. Admin foydalanuvchi turlari

Actual role nomlari mavjud domain modelidan olinadi. Quyidagi rollar konseptual:

## 3.1. Operatsion admin

Vazifalari:

- bron so‘rovlarini ko‘rish;
- approve/reject;
- jadvalni kuzatish;
- foydalanuvchini ko‘rish;
- mavjud huquqi doirasida cancellation.

Ko‘rishi shart:

- Jadval
- So‘rovlar
- Foydalanuvchilar

Ko‘rmasligi mumkin:

- Adminlar
- Tizim sozlamalarining xavfli qismi

## 3.2. Kengaytirilgan admin

Qo‘shimcha vazifalari:

- recurring bronlar;
- foydalanuvchi approval;
- ayrim settings;
- notification boshqaruvi.

## 3.3. Owner yoki yuqori huquqli admin

Qo‘shimcha vazifalari:

- admin taklif qilish;
- role o‘zgartirish;
- adminni olib tashlash;
- global settings;
- timezone va booking policy;
- audit konteksti.

**Muhim:** UI role nomini o‘zi ixtiro qilmaydi. `Admin` model va mavjud authorization qoidalari authoritative.

---

# 4. Axborot arxitekturasi

Mavjud admin sahifalari:

```text
Schedule.tsx
Requests.tsx
Users.tsx
Recurring.tsx
Admins.tsx
Settings.tsx
```

Mobile Telegram Mini App uchun primary navigation:

```text
Jadval
So‘rovlar
Foydalanuvchilar
Ko‘proq
```

`Ko‘proq` ichida:

```text
Recurring bronlar
Adminlar
Sozlamalar
```

Agar mavjud `RoleBottomNav.tsx` boshqa navigation modelidan foydalansa, arxitektura buzilmaydi. Ammo mobile information architecture yuqoridagi priority’ni saqlashi kerak.

## 4.1. Role-aware navigation

- Ruxsatsiz destination umuman ko‘rsatilmaydi.
- Disabled navigation item bilan permissionni oshkor qilmaslik.
- Route guard server tarafda authoritative.
- UI hidden bo‘lishi security emas, faqat usability.

## 4.2. Default admin landing

Default route:

```text
Pending so‘rovlar mavjud bo‘lsa → So‘rovlar
Aks holda → Jadval
```

Agar mavjud router fixed default route ishlatsa, `Jadval` default bo‘lishi mumkin. Pending badge esa action priority’ni saqlaydi.

---

# 5. Admin visual direction

Admin UI user UI bilan bir xil brand tilida, lekin quyidagi farqlar bilan:

| User UI                  | Admin UI                     |
| ------------------------ | ---------------------------- |
| Yumshoq, kam ma’lumotli  | Zichroq, operatsion          |
| Booking-first            | Triage-first                 |
| Bitta primary action     | Bir nechta contextual action |
| Katta hero               | Kichik summary cards         |
| Soddalashtirilgan status | Batafsil status va metadata  |

Visual tavsif:

- Ochiq, professional, neutral surface.
- Telegram theme bilan mos.
- Primary rang faqat navigation va asosiy action.
- Pending — amber.
- Approved — green.
- Rejected/cancelled — red yoki neutral history.
- Conflict — danger + explicit icon.
- Liquid glass faqat header va bottom navigation.
- Data-heavy content solid cards va sectionlar ichida.
- Mobile’da tables emas, cards/list.
- Tablet’da compact table-like rows mumkin.

---

# 6. Design tokenlari

Admin user design bilan token parity saqlaydi.

## 6.1. Ranglar

```css
:root {
  --admin-bg: var(--tg-theme-bg-color, #f4f7fb);
  --admin-surface: var(--tg-theme-secondary-bg-color, #ffffff);
  --admin-surface-strong: var(--tg-theme-section-bg-color, #ffffff);

  --admin-text: var(--tg-theme-text-color, #111827);
  --admin-muted: var(--tg-theme-hint-color, #667085);
  --admin-subtitle: var(--tg-theme-subtitle-text-color, #667085);

  --admin-primary: var(--tg-theme-button-color, #2f6df6);
  --admin-on-primary: var(--tg-theme-button-text-color, #ffffff);
  --admin-link: var(--tg-theme-link-color, #2f6df6);
  --admin-danger: var(--tg-theme-destructive-text-color, #d92d4c);

  --admin-success: #087a55;
  --admin-success-soft: #eafaf3;

  --admin-warning: #a45a00;
  --admin-warning-soft: #fff5df;

  --admin-danger-soft: #fff0f3;
  --admin-info-soft: #edf3ff;
  --admin-neutral-soft: rgba(127, 139, 160, 0.09);
}
```

Dark mode’da Telegram theme params authoritative. Semantic ranglar kontrast uchun dark variantlarga ega bo‘ladi.

## 6.2. Spacing

4px grid:

```text
4, 8, 12, 16, 20, 24, 32, 40
```

Admin UI user UI’dan biroz zichroq:

| Element                   | Spacing |
| ------------------------- | ------: |
| Screen horizontal padding | 12–16px |
| Compact list row          | 12–14px |
| Detail card               | 16–20px |
| Section gap               | 18–24px |
| Inline metadata gap       |   6–8px |
| Action group gap          |     8px |

## 6.3. Radius

```text
10px — badge, micro controls
14px — button, filter chip
18–20px — list card
24–28px — modal, bottom sheet
```

## 6.4. Touch target

- Icon button: 44×44px
- Filter: min 42px
- Primary button: min 48px
- Row action: min 44px
- Checkbox/radio visual kichik bo‘lishi mumkin, hit area 44px

## 6.5. Typography

| Rol           |    Size |  Weight |
| ------------- | ------: | ------: |
| Page title    | 24–30px |     820 |
| KPI value     | 24–32px |     850 |
| Section title | 17–18px |     760 |
| Card title    | 14–16px |     720 |
| Body          | 13–14px | 400–500 |
| Metadata      | 11–12px | 500–650 |
| Badge         | 10–11px | 760–820 |

Time va numeric KPI:

```css
font-variant-numeric: tabular-nums;
```

---

# 7. Admin app shell

## 7.1. Sticky header

Tuzilishi:

```text
[Admin avatar] [Ism + role]        [Search] [Alerts badge]
```

Header:

- sticky;
- safe-area aware;
- liquid-glass;
- maximum ikki blur layer siyosatiga mos;
- admin role subtitle;
- avatar Telegram user’dan;
- global search yoki contextual search trigger;
- pending alert badge.

## 7.2. Global alert badge

Badge hisoblaydi:

```text
pending booking requests
+ pending user approvals
+ critical system warnings
```

Badge click:

- action center sheet;
- bo‘limlar bo‘yicha count;
- eng ustuvor actionga tez o‘tish.

## 7.3. More navigation sheet

`Ko‘proq` bosilganda:

```text
Recurring bronlar
Adminlar
Sozlamalar
```

Role bo‘yicha itemlar filtrlanadi.

Sheet:

- Telegram BackButton bilan yopiladi;
- browser Escape fallback;
- route tanlanganda yopiladi;
- current destination ko‘rsatiladi.

---

# 8. Admin operational summary

Admin birinchi darajali sahifalarda compact KPI summary ko‘rishi mumkin.

Recommended KPI:

```text
Pending so‘rovlar
Bugungi bronlar
Tasdiqlash kutayotgan userlar
Bugungi bandlik %
```

Qoidalar:

- Maksimal 4 KPI.
- Har KPI clickable bo‘lsa destination aniq.
- KPI dekoratsiya emas; actionga olib borishi kerak.
- “0” qiymati yashirilmaydi.
- Loading’da skeleton.
- Error’da “—” va retry.

---

# 9. Requests sahifasi

File:

```text
src/ui/pages/admin/Requests.tsx
```

## 9.1. Asosiy maqsad

Admin pending requestni eng kam vaqt va eng kam xato bilan qaror qiladi.

## 9.2. Default view

Default filter:

```text
Kutilmoqda
```

Default sort:

1. Eng yaqin bron vaqti.
2. So‘rov yaratilgan vaqt.
3. Domain priority mavjud bo‘lsa o‘sha.

## 9.3. Filterlar

Primary:

```text
Kutilmoqda
Tasdiqlandi
Rad etildi
Barchasi
```

Secondary advanced filters:

- Sana
- Foydalanuvchi
- Davomiylik
- Qaror bergan admin
- Conflict/status
- Yaratilgan vaqt

Advanced filterlar collapsible filter sheet’da.

## 9.4. Request card

Mobile card anatomiyasi:

```text
[09:00–10:30]  [Kutilmoqda]
Seshanba, 14-iyul
Aziz Karimov
90 daqiqa
So‘rov: 8 daqiqa oldin

[Rad etish] [Tasdiqlash]
```

Ko‘rsatish kerak:

- start/end;
- date;
- user display name;
- duration;
- request age;
- current status;
- relevant queue position if domain’da mavjud;
- conflict warning;
- user approval status;
- admin decision metadata history itemlarda.

Sensitive user data minimal.

## 9.5. Quick approve

Approve action:

1. Button press.
2. Button loading.
3. Backend availability qayta tekshiradi.
4. Success:
   - request approved;
   - notification yuboriladi;
   - list’dan chiqadi yoki approved state’ga o‘tadi;
   - success haptic;
   - concise toast.
5. Conflict:
   - request approve qilinmaydi;
   - “Vaqt konflikti” banner;
   - schedule context ko‘rsatiladi;
   - refresh action.
6. Auth/role error:
   - safe message;
   - action disabled.

## 9.6. Reject flow

Reject bosilganda bottom sheet:

```text
So‘rovni rad etish
Foydalanuvchiga sabab ko‘rsatiladimi?
[Reason options]
[Optional/required note]
[Rad etishni tasdiqlash]
```

Reason options domain’ga mos:

- Vaqt mavjud emas
- Jadval o‘zgardi
- Noto‘g‘ri ma’lumot
- Boshqa sabab

Agar backend faqat free-text qabul qilsa, UI reason + note’ni bitta safe stringga map qiladi.

Reject destructive, ammo approve bilan bir xil primary rangda emas.

## 9.7. Request detail sheet

Card click bilan detail:

- full date/time;
- duration;
- created timestamp;
- user summary;
- user approval state;
- overlapping schedule context;
- request status history;
- notification status if available;
- approve/reject actions.

Detail sheet route almashtirmasdan qaror qilish imkonini beradi.

## 9.8. Empty state

Pending yo‘q:

> Hozircha yangi so‘rov yo‘q.

Qo‘shimcha:

- Bugungi jadvalga o‘tish.
- Pull-to-refresh yoki refresh action.
- Last synced time.

## 9.9. Batch actions

P0’da batch approve/reject yo‘q, agar domain va API alohida transactional support bermasa.

Sabab:

- Har request individual conflict tekshiradi.
- Bulk approval xato xavfini oshiradi.

---

# 10. Schedule sahifasi

File:

```text
src/ui/pages/admin/Schedule.tsx
```

## 10.1. Maqsad

Admin:

- bugungi holatni ko‘radi;
- band va bo‘sh intervalni ajratadi;
- request/booking detailga kiradi;
- domain qo‘llasa manual block yoki cancellation qiladi.

## 10.2. View modes

```text
Kun
Hafta
```

Mobile default:

```text
Kun
```

Tablet’da hafta grid.

## 10.3. Day summary

```text
Bugungi bronlar
Bandlik foizi
Bo‘sh vaqt
Pending so‘rovlar
```

## 10.4. Timeline

Day timeline:

- opening time’dan closing time’gacha;
- 30-minute yoki current slot interval;
- approved bookings;
- pending requests;
- recurring instances;
- manual closed/blocked interval;
- current-time indicator;
- past region muted.

Status visual:

| Holat     | Visual               |
| --------- | -------------------- |
| Approved  | success surface      |
| Pending   | warning surface      |
| Recurring | primary/info pattern |
| Closed    | neutral stripe       |
| Conflict  | danger outline       |
| Past      | muted                |

## 10.5. Privacy

Admin permissioniga qarab user identity ko‘rsatiladi. Limited admin uchun phone yoki Telegram ID faqat zarur bo‘lsa.

## 10.6. Booking detail

Timeline item click:

- user;
- time;
- duration;
- source: one-time/recurring;
- request status;
- created/approved by;
- notification state;
- cancellation action if authorized;
- audit eventlar mavjud bo‘lsa history.

## 10.7. Manual action

Faqat mavjud backend support qilsa:

- manual booking;
- block interval;
- unblock interval;
- cancel booking.

UI backend’da yo‘q actionni fake qilmaydi.

## 10.8. Calendar navigation

- Previous/next day.
- Today.
- Week date strip.
- Telegram haptic selection.
- Timezone label settings’dan.

---

# 11. Users sahifasi

File:

```text
src/ui/pages/admin/Users.tsx
```

## 11.1. Tabs

```text
Tasdiqlash kutmoqda
Faol
Rad etilgan
Barchasi
```

Actual statuses modeldan olinadi.

## 11.2. Search

Search fields:

- ism;
- telefon;
- Telegram username;
- Telegram ID, faqat admin huquqi va mavjud API bo‘lsa.

Search:

- debounce 250–350ms;
- clear action;
- no-results state;
- keyboard-friendly.

## 11.3. User card

```text
[Avatar] Aziz Karimov        [Kutilmoqda]
         +998 ...
         12-iyulda qo‘shilgan

[Rad etish] [Tasdiqlash]
```

Metadata:

- joined date;
- request count;
- approved bookings count;
- current status;
- last activity if available;
- assigned admin if applicable.

## 11.4. User approval

Approve:

- loading;
- backend role/auth check;
- success state;
- user notification;
- success toast/haptic.

Reject:

- confirmation;
- optional/required reason domain’ga mos;
- user notification;
- safe destructive UI.

## 11.5. User detail

Detail sheet/page:

- profile;
- status;
- booking statistics;
- recent requests;
- approval history;
- notification history if allowed;
- actions based on role.

## 11.6. Unsupported actions

Suspend, ban, edit phone yoki delete user faqat domain va API mavjud bo‘lsa ko‘rsatiladi.

UI’da “kelajak uchun” ishlamaydigan tugma bo‘lmaydi.

---

# 12. Recurring sahifasi

File:

```text
src/ui/pages/admin/Recurring.tsx
```

Service:

```text
src/services/recurring.ts
```

## 12.1. Maqsad

Recurring bronlar:

- ko‘rish;
- yaratish;
- tahrirlash;
- pause/resume;
- tugatish;
- conflict preview.

Faqat mavjud domain actionlari ishlatiladi.

## 12.2. Recurring card

Ko‘rsatadi:

- nom yoki user;
- weekday;
- start/end;
- recurrence interval;
- next occurrence;
- active/paused;
- conflict warning;
- created by.

## 12.3. Create/edit flow

Step-based sheet:

### Step 1 — Kim uchun

- mavjud user tanlash;
- user qidirish;
- approval status.

### Step 2 — Jadval

- weekday;
- start;
- duration;
- start date;
- optional end date yoki count, domain support qilsa.

### Step 3 — Conflict preview

- upcoming conflicts;
- existing bookings;
- skipped occurrences policy;
- confirmation summary.

### Step 4 — Save

- MainButton;
- loading;
- server validation;
- result feedback.

## 12.4. Conflict policy

UI conflictni “o‘zi hal qilmaydi”.

Backend response asosida:

- create blocked;
- skip occurrence;
- admin confirmation;
- domain policy.

`SPEC.md` va recurring service authoritative.

## 12.5. Pause va delete

- Pause reversible.
- Delete/end destructive confirmation.
- Past generated bookings bilan nima bo‘lishi summary’da ko‘rsatiladi.

---

# 13. Admins sahifasi

File:

```text
src/ui/pages/admin/Admins.tsx
```

Related domain:

```text
Admin
InviteToken
admin-invite bot flow
admin role tests
```

## 13.1. Access

Faqat ruxsatli role.

Ruxsatsiz route:

- server 403/redirect;
- UI nav item yashirin;
- permission details oshkor qilinmaydi.

## 13.2. Admin list

Ko‘rsatadi:

- avatar/initials;
- name;
- role;
- status;
- added date;
- invited by;
- last activity if available.

## 13.3. Invite admin

Flow:

1. Role tanlash.
2. Permission summary.
3. Invite token yaratish.
4. Telegram deep-link.
5. Copy/share.
6. Expiration ko‘rsatish.
7. Revoke action.

Invite token:

- bir marta ishlatilsa status yangilanadi;
- expired/revoked holat;
- raw secret listda doim ko‘rsatilmaydi.

## 13.4. Role change

- Current va new role comparison.
- Permission delta.
- Destructive yoki privilege-escalation confirmation.
- O‘z role’ini pasaytirish yoki oxirgi ownerni olib tashlash domain’da bloklanadi.
- Server authoritative.

## 13.5. Remove admin

- explicit admin name;
- role;
- impact summary;
- destructive confirmation;
- typed confirmation faqat yuqori xavfli holatda, mobile UX’ni ortiqcha og‘irlashtirmasdan.

---

# 14. Settings sahifasi

File:

```text
src/ui/pages/admin/Settings.tsx
```

Related:

```text
Settings model
availability service
timezone tests
booking duration tests
notification service
```

## 14.1. Sectionlar

```text
Ish vaqti
Bron qoidalari
Timezone
Notification
Telegram bot
Xavfli amallar
```

## 14.2. Ish vaqti

- opening time;
- closing time;
- closed days, domain support qilsa;
- temporary closure, support qilsa.

Validation:

- closing > opening;
- durationlarga yetarli interval;
- existing future bookings impact preview.

## 14.3. Bron qoidalari

- slot interval;
- allowed durations;
- minimum/maximum duration;
- cancellation policy, domain’da mavjud bo‘lsa;
- approval requirement.

Changing settings:

- unsaved state;
- save button;
- validation;
- impact summary;
- Telegram MainButton optional.

## 14.4. Timezone

Timezone critical.

- Current timezone.
- Example current local time.
- Existing future booking impact.
- Explicit confirmation.
- `timezone_anchor_test.ts` behavior saqlanadi.
- Browser timezone avtomatik authoritative emas.

## 14.5. Notification

- user approval notifications;
- booking approved/rejected;
- cancellation;
- recurring alerts;
- admin alerts.

Faqat notify service qo‘llaydigan options.

## 14.6. Save pattern

- Section-level save.
- “Hammasini saqlash” faqat atomic API bo‘lsa.
- Dirty indicator.
- Leave confirmation.
- Success toast.
- Error state field yonida.

## 14.7. Dangerous settings

- destructive actionlar oddiy settings bilan aralashmaydi;
- alohida danger section;
- role gate;
- confirmation.

---

# 15. Status tizimi

## 15.1. Booking/request

```text
Kutilmoqda
Tasdiqlandi
Rad etildi
Bekor qilindi
Konflikt
```

## 15.2. User

Actual modeldan, masalan:

```text
Tasdiqlash kutmoqda
Faol
Rad etilgan
```

## 15.3. Recurring

```text
Faol
Pauzada
Tugagan
Konflikt
```

## 15.4. Admin invite

```text
Faol
Ishlatilgan
Muddati tugagan
Bekor qilingan
```

## 15.5. Status visual qoidalari

- Matn doim mavjud.
- Rang faqat qo‘shimcha signal.
- Icon optional.
- Badge mobile’da 1 qator.
- Long status abbreviation qilinmaydi; responsive layout o‘zgaradi.

---

# 16. Action hierarchy

## Primary

- Tasdiqlash
- Saqlash
- Yaratish
- Davom etish

## Secondary

- Batafsil
- Tahrirlash
- Filter
- Qayta urinish

## Destructive

- Rad etish
- Bekor qilish
- Adminni olib tashlash
- Invite revoke
- Recurring tugatish

## Action pair qoidasi

Approve/reject pair:

```text
[Rad etish — outline/soft danger]
[Tasdiqlash — primary]
```

Danger action primary rangda bo‘lmaydi.

---

# 17. Confirmation patterns

## 17.1. No confirmation

- Filter.
- Navigation.
- Detail open.
- Pending request view.
- Reversible UI preference.

## 17.2. Lightweight confirmation

- Reject request.
- Reject user.
- Pause recurring.
- Cancel pending operational action, domain policyga qarab.

## 17.3. Strong confirmation

- Approved booking cancellation.
- Admin removal.
- Role privilege change.
- Global timezone change.
- Recurring delete/end.
- Dangerous settings.

Confirmation copy:

- action nomi;
- affected entity;
- impact;
- destructive button aniq matn.

Yomon:

```text
Ishonchingiz komilmi?
[Ha] [Yo‘q]
```

Yaxshi:

```text
Aziz Karimovning 14-iyul, 09:00–10:00 bronini bekor qilasizmi?
Bu amal foydalanuvchiga bildirishnoma yuboradi.

[Saqlab qolish] [Bronni bekor qilish]
```

---

# 18. Search va filter UX

## 18.1. Search behavior

- 250–350ms debounce.
- Loading indicator.
- Clear button.
- Search query URL/state’da saqlanishi mumkin.
- Back navigation filter state’ni saqlaydi.

## 18.2. Filter chiplar

Primary status filters top-level.

Advanced filters sheet:

- count badge;
- “Tozalash”;
- “Qo‘llash”;
- active filter summary.

## 18.3. Sort

Sort labels user language’da:

- Eng yaqin vaqt
- Eng yangi
- Eng eski
- Ism bo‘yicha

Backend pagination bo‘lsa sort server-side.

---

# 19. Loading, empty, error va offline

## 19.1. Loading

Requests:

- 3 compact card skeleton.

Schedule:

- timeline skeleton.

Users:

- avatar + 2 text line skeleton.

Settings:

- form skeleton yoki disabled initial fields.

## 19.2. Empty

Actionable va specific:

```text
Hozircha yangi so‘rov yo‘q.
Tasdiqlash kutayotgan foydalanuvchi yo‘q.
Bu kunda bron mavjud emas.
Recurring bron topilmadi.
```

## 19.3. Error

Error anatomy:

```text
Nima bo‘ldi
Qanday tiklash mumkin
[Qayta urinish]
```

Raw HTTP yoki stack trace yo‘q.

## 19.4. Offline

- Top offline banner.
- Read-only cached content.
- Mutations disabled.
- Connection qaytganda retry.
- Offline action tap’ida aniq explanation.

---

# 20. Optimistic va pessimistic updates

## 20.1. Pessimistic required

- Approve request.
- Reject request.
- Cancel approved booking.
- User approval.
- Role change.
- Settings save.
- Recurring create/update.
- Admin removal.

Server success’dan oldin final state ko‘rsatilmaydi.

## 20.2. Optimistic allowed

- Filter state.
- Accordion.
- UI preference.
- Detail open.
- Reversible local navigation.

Admin domain state’da fake success yo‘q.

---

# 21. Telegram Mini App integratsiyasi

## 21.1. Native controls

| API                   | Admin use                         |
| --------------------- | --------------------------------- |
| `ready()`             | app ready                         |
| `expand()`            | full viewport                     |
| `BackButton`          | detail/sheet/more close           |
| `MainButton`          | approve/save/create               |
| `SettingsButton`      | Settings route, role ruxsat bersa |
| `HapticFeedback`      | selection/success/warning/error   |
| `showPopup`           | destructive confirmation          |
| `openTelegramLink`    | bot/invite/support                |
| `themeChanged`        | live theme                        |
| `initDataUnsafe.user` | display only                      |

## 21.2. MainButton priority

Faqat bitta active workflow:

- request detail approve;
- reject form submit;
- recurring save;
- settings save.

Bir vaqtning o‘zida multiple MainButton action yo‘q.

## 21.3. Authentication

- `initDataUnsafe` auth emas.
- Existing `initData` verification authoritative.
- Admin role serverda tekshiriladi.
- UI permissionni faqat presentation uchun ishlatadi.

---

# 22. Accessibility

- 44×44px minimum target.
- Dialog semantics.
- `aria-live` status.
- `aria-current` navigation.
- `aria-selected` filters.
- Table-like data mobile’da semantic list.
- Focus return sheet yopilganda triggerga.
- Escape browser’da close.
- Reduced motion.
- Reduced transparency.
- Color-only status yo‘q.
- 200% zoom.
- Screen reader action label entity bilan:
  - “Aziz Karimov so‘rovini tasdiqlash”
  - “14-iyul bronini bekor qilish”

---

# 23. Motion

Motion admin ishini sekinlashtirmaydi.

## CSS

- button press 150ms;
- chip selection 160ms;
- sheet 280ms;
- toast 230ms;
- nav icon 260ms.

## Page enter

Optional 280–360ms subtle stagger.

## No motion

- large parallax;
- continuous decorative float;
- background animation;
- animated KPI counting;
- long route transition.

Haptic ko‘p ishlatilmaydi:

- selection;
- approve success;
- destructive warning;
- error.

---

# 24. Responsive behavior

## 320–389px

- KPI 2×2.
- Cards stacked.
- Approve/reject full-width pair.
- Filter horizontal scroll.
- Schedule day view.
- More navigation sheet.
- No wide tables.

## 390–679px

- KPI 2×2 yoki 4 compact.
- Request action side-by-side.
- Schedule timeline.
- Detail sheet.

## 680–1024px

- Optional split layout:
  - list left;
  - detail right.
- Schedule week view.
- User/admin list denser.
- Max content width 1100px, lekin Telegram context saqlanadi.

Admin panel desktop dashboardga aylanmaydi. Tablet density faqat operatsion samaradorlik uchun.

---

# 25. Data model mapping

Actual TypeScript models authoritative. UI-level view models tavsiya:

```ts
type AdminRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "conflict";

interface AdminBookingRequestView {
  id: string;
  userId: string;
  userDisplayName: string;
  userApprovalStatus?: string;
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
  status: AdminRequestStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  note?: string;
  conflict?: {
    code: string;
    message: string;
  };
}
```

```ts
interface AdminUserView {
  id: string;
  displayName: string;
  phone?: string;
  username?: string;
  status: string;
  joinedAt: string;
  requestCount: number;
  approvedBookingCount: number;
}
```

```ts
interface AdminScheduleItem {
  id: string;
  type: "booking" | "request" | "recurring" | "blocked";
  date: string;
  start: string;
  end: string;
  status: string;
  userDisplayName?: string;
  recurringId?: string;
}
```

---

# 26. API contracts

Actual `src/api/admin.ts` authoritative.

Recommended resource boundaries:

```text
GET    /api/admin/summary
GET    /api/admin/requests
GET    /api/admin/requests/:id
POST   /api/admin/requests/:id/approve
POST   /api/admin/requests/:id/reject

GET    /api/admin/schedule
POST   /api/admin/bookings/:id/cancel

GET    /api/admin/users
GET    /api/admin/users/:id
POST   /api/admin/users/:id/approve
POST   /api/admin/users/:id/reject

GET    /api/admin/recurring
POST   /api/admin/recurring
PATCH  /api/admin/recurring/:id
POST   /api/admin/recurring/:id/pause
POST   /api/admin/recurring/:id/resume

GET    /api/admin/admins
POST   /api/admin/invites
POST   /api/admin/invites/:id/revoke
PATCH  /api/admin/admins/:id/role
DELETE /api/admin/admins/:id

GET    /api/admin/settings
PATCH  /api/admin/settings
```

Bu route nomlari majburiy emas. Existing API saqlanadi.

## Conflict response

```json
{
  "error": "BOOKING_CONFLICT",
  "message": "Selected interval is no longer available",
  "context": {
    "date": "2026-07-14",
    "start": "09:00",
    "end": "10:00"
  }
}
```

UI raw error code’ni ko‘rsatmaydi.

---

# 27. Audit va event history

Agar `BookingEvent` mavjud API orqali ochilgan bo‘lsa, detail sahifada timeline:

```text
So‘rov yaratildi
Admin ko‘rdi
Tasdiqlandi
Notification yuborildi
Bekor qilindi
```

Qoidalar:

- Audit tarix edit qilinmaydi.
- Actor va timestamp.
- Technical metadata default yashirin.
- Faqat ruxsatli admin ko‘radi.

---

# 28. Performance

Maqsad:

| Metric                  |     Target |
| ----------------------- | ---------: |
| First usable admin view |     < 1.8s |
| Filter interaction      |    < 100ms |
| Action feedback start   |    < 100ms |
| List page size          | 20–50 item |
| Blur layers             |        ≤ 2 |
| Long task               |     < 50ms |

Tavsiyalar:

- Existing server-rendered TSX architecture saqlanadi.
- Large SPA framework qo‘shilmaydi.
- Inline SVG/Lucide reuse.
- Remote font yo‘q.
- Pagination.
- Debounced search.
- Derived counts serverdan yoki efficient aggregation.
- CSS source `src/styles/input.css`, generated output project workflow orqali.

---

# 29. Security va permission

- Admin route server-side guard.
- CSRF/auth existing modelga mos.
- Telegram initData backend verification.
- Role change serverda.
- Last owner protection.
- User PII minimal.
- Invite token secret exposure kamaytiriladi.
- Destructive action audit.
- Booking approve server-side revalidation.
- Settings schema validation.
- No client-only permission trust.

---

# 30. Test strategiyasi

Existing tests saqlanadi:

```text
admin_roles_test.ts
auth_test.ts
approval_test.ts
booking_duration_test.ts
cancellation_test.ts
client_script_syntax_test.tsx
reject_notification_test.ts
timezone_anchor_test.ts
user_requests_test.ts
```

Admin UI uchun qo‘shimcha testlar:

1. Pending request default filter.
2. Approve conflict safe error.
3. Reject notification path.
4. Unauthorized admin route hidden/blocked.
5. Role-based nav.
6. Pending user approval.
7. Schedule timezone.
8. Recurring conflict preview.
9. Last privileged admin removal blocked.
10. Settings validation.
11. Client script syntax.
12. User pages shared component change’dan buzilmagan.
13. Admin pages browser fallback.
14. Telegram SDK absence safe.
15. Dark theme output.

---

# 31. Analytics

Recommended events:

```text
admin_app_open
admin_request_viewed
admin_request_approved
admin_request_rejected
admin_request_conflict
admin_schedule_date_selected
admin_booking_cancelled
admin_user_viewed
admin_user_approved
admin_user_rejected
admin_recurring_created
admin_recurring_paused
admin_recurring_updated
admin_invite_created
admin_invite_revoked
admin_role_changed
admin_settings_saved
admin_settings_validation_failed
admin_filter_applied
admin_search_used
```

PII analytics payload’ga yuborilmaydi.

---

# 32. QA checklist

## Requests

- [ ] Pending default.
- [ ] Approve loading.
- [ ] Approve conflict.
- [ ] Reject reason.
- [ ] Notification feedback.
- [ ] Empty state.
- [ ] Pagination.
- [ ] Search/filter state.

## Schedule

- [ ] Day view.
- [ ] Week view.
- [ ] Timezone.
- [ ] Past indicator.
- [ ] Recurring item.
- [ ] Conflict visual.
- [ ] Booking detail.
- [ ] Unauthorized action hidden.

## Users

- [ ] Pending approval.
- [ ] Approve/reject.
- [ ] Search.
- [ ] No results.
- [ ] Long name.
- [ ] Missing phone.
- [ ] User detail.

## Recurring

- [ ] Create.
- [ ] Edit.
- [ ] Conflict.
- [ ] Pause/resume.
- [ ] End confirmation.
- [ ] Past occurrence behavior.

## Admins

- [ ] Permission gate.
- [ ] Invite.
- [ ] Token expiry.
- [ ] Revoke.
- [ ] Role change.
- [ ] Last owner protection.
- [ ] Remove confirmation.

## Settings

- [ ] Opening/closing validation.
- [ ] Duration validation.
- [ ] Timezone warning.
- [ ] Dirty state.
- [ ] Save success/error.
- [ ] Permission gate.

## Platform

- [ ] Telegram light.
- [ ] Telegram dark.
- [ ] Browser preview.
- [ ] 320px.
- [ ] 390px.
- [ ] 430px.
- [ ] 768px.
- [ ] Safe-area.
- [ ] Offline.
- [ ] Reduced motion.
- [ ] Reduced transparency.
- [ ] Keyboard.
- [ ] Screen reader labels.

---

# 33. Implementatsiya prioritetlari

## P0

- Requests triage.
- Approve/reject safety.
- Schedule day view.
- Users approval.
- Role-aware navigation.
- Telegram theme/safe-area.
- Loading/error/empty.
- Accessibility.
- Existing domain/test preservation.

## P1

- Week schedule.
- Request detail sheet.
- User detail.
- Recurring redesign.
- Admin invite redesign.
- Settings structured sections.
- Offline state.
- Analytics.

## P2

- Split view tablet.
- Audit timeline.
- Advanced filters.
- Saved filters.
- Notification center.
- Operational trend charts.

Charts faqat real decisionga yordam bersa qo‘shiladi. Decorative analytics yo‘q.

---

# 34. Developer handoff

Relevant existing files:

```text
src/ui/pages/admin/Requests.tsx
src/ui/pages/admin/Schedule.tsx
src/ui/pages/admin/Users.tsx
src/ui/pages/admin/Recurring.tsx
src/ui/pages/admin/Admins.tsx
src/ui/pages/admin/Settings.tsx

src/ui/components/BookCard.tsx
src/ui/components/LucideIcons.tsx
src/ui/components/RoleBottomNav.tsx
src/ui/components/UIComponents.tsx

src/ui/layout.tsx
src/ui/router.tsx
src/styles/input.css
static/app.css

src/api/admin.ts
src/services/availability.ts
src/services/booking.ts
src/services/notify.ts
src/services/recurring.ts

src/repo/repo.ts
src/repo/kv-repo.ts
src/repo/pg-repo.ts
```

Production implementation:

1. Existing repository audit.
2. Domain/API contract mapping.
3. Token foundation.
4. Requests P0.
5. Schedule.
6. Users.
7. Role-aware navigation.
8. Recurring.
9. Admins.
10. Settings.
11. Accessibility/performance.
12. Full tests.
13. Browser/Telegram verification.

---

# 35. Final admin design principle

> Admin panel administratorga ko‘proq ma’lumot ko‘rsatish uchun emas, eng muhim qarorni to‘g‘ri kontekst va eng kam xato bilan qabul qilish uchun yaratiladi.

Har bir admin ekrani quyidagi savolga javob berishi kerak:

```text
Hozir nima muhim?
Qaror uchun nima bilishim kerak?
Bu action oqibati nima?
Xato bo‘lsa qanday tiklanaman?
```
