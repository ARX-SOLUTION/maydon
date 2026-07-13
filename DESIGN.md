# BronQilish — Telegram Mini App Design Specification

> **Holat:** Advanced UI/UX specification  
> **Platforma:** Telegram Mini App  
> **Asosiy til:** O‘zbekcha  
> **Asosiy maqsad:** Foydalanuvchiga mavjud vaqtni tez topish, xavfsiz bron so‘rovi yuborish va so‘rov holatini tushunarli tarzda boshqarish imkonini berish.  
> **Bog‘liq prototip:** `bronqilish-telegram-miniapp-max-ux.html`  
> **Hujjat turi:** Dizayn tizimi, UX oqimlari, komponent spetsifikatsiyasi va implementatsiya yo‘riqnomasi

---

## 1. Mahsulot haqida

BronQilish — Telegram ichida ishlaydigan mini-ilova bo‘lib, foydalanuvchi quyidagi vazifalarni bajaradi:

1. Hafta bo‘yicha bo‘sh vaqtlarni ko‘radi.
2. O‘ziga mos sana va vaqtni tanlaydi.
3. Bron davomiyligini belgilaydi.
4. So‘rov yuboradi.
5. So‘rovning kutilmoqda, tasdiqlangan yoki rad etilgan holatini kuzatadi.
6. Zarur bo‘lsa so‘rovni yoki tasdiqlangan bronni bekor qiladi.
7. Profil va Telegram bot orqali shaxsiy ma’lumotlarini boshqaradi.

Ilova tez ishlashi, kichik ekranda tushunarli bo‘lishi va Telegram interfeysidan ajralib qolmasligi kerak.

---

## 2. Dizayn savoli

Ushbu dizayn quyidagi asosiy savolga javob beradi:

> **Foydalanuvchi bron qilish jarayonini xato qilmasdan, keraksiz scroll va ortiqcha qarorlarsiz, 20–30 soniya ichida yakunlay oladimi?**

Dizayn qarorlari shu savolga xizmat qiladi. Estetika funksionallikdan ustun qo‘yilmaydi.

---

## 3. UX maqsadlari

### 3.1. Birlamchi maqsadlar

- Eng yaqin bo‘sh vaqtni birinchi ekranda ko‘rsatish.
- Foydalanuvchini uzoq slot ro‘yxatini ko‘rishga majbur qilmaslik.
- Band, o‘tgan, cheklangan va foydalanuvchining o‘z bronlarini aniq ajratish.
- Davomiylik tanlanganda tugash vaqtini oldindan ko‘rsatish.
- Kesishadigan yoki yaroqsiz davomiyliklarni avtomatik o‘chirish.
- So‘rov yuborilgandan keyin aniq feedback berish.
- Bekor qilishni xatoga chidamli qilish.
- Telegram mavzusi, safe-area va native button xatti-harakatlariga moslashish.

### 3.2. Ikkinchi darajali maqsadlar

- Ilovani birinchi marta ishlatayotgan foydalanuvchiga tushunarli onboarding berish.
- Takroriy foydalanuvchiga tezkor, qisqa oqim berish.
- Internet uzilganda foydalanuvchini xabardor qilish.
- Ko‘rish qobiliyati, harakat sezgirligi va kichik ekran ehtiyojlarini hisobga olish.
- Past quvvatli Android qurilmalarida og‘ir blur va animatsiyalarni kamaytirish.

### 3.3. Muvaffaqiyat mezonlari

Quyidagi metrikalar kuzatilishi tavsiya qilinadi:

| Metrika | Maqsad |
|---|---:|
| Jadvaldan so‘rov yuborishgacha bo‘lgan median vaqt | ≤ 30 soniya |
| Bron modalini yopib ketish darajasi | < 20% |
| Noto‘g‘ri davomiylik tanlash xatolari | 0 |
| Tasdiqlangan bronni tasodifiy bekor qilish | 0 |
| Birinchi urinishda muvaffaqiyatli so‘rov yuborish | ≥ 90% |
| Jadvalda keraksiz vertikal scroll | Minimal |
| Dark mode kontrast muammolari | 0 kritik xato |

---

## 4. Foydalanuvchi turlari

### 4.1. Tez bron qiluvchi foydalanuvchi

**Xatti-harakat:** ilovani ochadi, eng yaqin bo‘sh vaqtni tanlaydi, 1 soatlik so‘rov yuboradi.  
**Ehtiyoj:** maksimal tezlik, kam bosish, aniq natija.  
**Dizayn javobi:** birinchi ekrandagi “Eng yaqin bo‘sh vaqt” kartasi va bitta asosiy CTA.

### 4.2. Aniq vaqt izlaydigan foydalanuvchi

**Xatti-harakat:** ma’lum kun va kun bo‘limidan vaqt qidiradi.  
**Ehtiyoj:** hafta navigatsiyasi, ertalab/kunduzi/kechqurun filtrlari.  
**Dizayn javobi:** horizontal date strip va period chiplar.

### 4.3. Holatni tekshiruvchi foydalanuvchi

**Xatti-harakat:** yuborilgan so‘rov tasdiqlanganmi yoki yo‘qmi tekshiradi.  
**Ehtiyoj:** statusni tez ko‘rish.  
**Dizayn javobi:** badge, status ranglari va “So‘rovlarim” tab.

### 4.4. Kam tajribali foydalanuvchi

**Xatti-harakat:** jarayon qanday ishlashini bilmaydi.  
**Ehtiyoj:** qisqa tushuntirish va xavfsiz interaction.  
**Dizayn javobi:** collapsible “Qanday ishlaydi?” bo‘limi, disabled holatlar va natijaviy feedback.

---

## 5. Axborot arxitekturasi

Ilova uchta asosiy bo‘limdan iborat:

```text
Jadval
├── Eng yaqin bo‘sh vaqt
├── Qanday ishlaydi?
├── Haftalik sana tanlash
├── Kun bo‘limlari
├── Band vaqtlarni ko‘rsatish
└── Vaqt slotlari

So‘rovlarim
├── Barchasi
├── Kutilmoqda
├── Tasdiqlandi
├── Rad etildi
└── Bekor qilish amallari

Profil
├── Shaxsiy ma’lumotlar
├── Bron statistikasi
├── Telegram bot
├── Til
├── Ko‘rinish
└── Yordam
```

Bottom navigation doimiy ravishda uchta asosiy bo‘limni ko‘rsatadi:

- Jadval
- So‘rovlarim
- Profil

Asosiy navigatsiyada maksimal uchta item saqlanadi. Qo‘shimcha bo‘limlar profil ichida joylashtiriladi.

---

## 6. Asosiy UX tamoyillari

### 6.1. Recognition over recall

Foydalanuvchi ma’lumotni eslab qolmasligi kerak. Sana, vaqt, davomiylik va tugash vaqti bir joyda ko‘rsatiladi.

### 6.2. Prevent errors before they happen

Band vaqt bilan kesishadigan davomiyliklar tanlab bo‘lmaydi. O‘tgan slotlar disabled holatda. Foydalanuvchi noto‘g‘ri kombinatsiyani tanlay olmaydi.

### 6.3. Progressive disclosure

Barcha ma’lumot birdan ko‘rsatilmaydi. “Qanday ishlaydi?” bo‘limi collapsible. Band vaqtlar default holatda yashiriladi. Bron tafsilotlari bottom sheet ichida ochiladi.

### 6.4. One primary action per context

Har bir ekranda faqat bitta asosiy CTA mavjud:

- Jadval: “Bron qilish”
- Modal: “So‘rov yuborish”
- Bo‘sh holat: “Jadvalga o‘tish”
- Profil: “Telegram botni ochish”

### 6.5. Status must be visible without reading

Status faqat matn bilan emas, rang, fon va icon orqali ko‘rsatiladi. Rang yagona signal emas; matn doim mavjud.

### 6.6. Reversible actions

Kutilayotgan so‘rov bekor qilinganda “Qaytarish” imkoniyati beriladi. Tasdiqlangan bron uchun esa qo‘shimcha confirmation talab qilinadi.

### 6.7. Native Telegram behavior first

Telegram `MainButton`, `BackButton`, `SettingsButton`, `HapticFeedback`, theme params va safe-area birinchi darajali platform xususiyatlari sifatida ishlatiladi.

---

## 7. Visual direction

Dizayn yo‘nalishi:

- Yengil liquid-glass qatlamlari.
- Oqartirilgan, toza va chuqur bo‘lmagan kartalar.
- Pastel semantik ranglar.
- O‘qilishi kuchli tipografiya.
- Minimal dekorativ gradient.
- Kontent ustuvor, effektlar ikkilamchi.
- Kichik ekranda vizual zichlik boshqarilgan.
- Rounded corners yumshoq, lekin haddan tashqari “bubble UI” emas.

Liquid glass faqat quyidagi joylarda ishlatiladi:

- Sticky header
- Bottom navigation
- Zarur bo‘lsa modal backdrop yaqinidagi floating elementlar

Asosiy kontent kartalarida toza solid surface ishlatiladi. Bu matn kontrastini va performance’ni saqlaydi.

---

## 8. Dizayn tokenlari

### 8.1. Rang tokenlari

```css
:root {
  --app-bg: var(--tg-theme-bg-color, #f4f7fb);
  --surface: var(--tg-theme-secondary-bg-color, #ffffff);
  --surface-strong: var(--tg-theme-section-bg-color, #ffffff);

  --text: var(--tg-theme-text-color, #111827);
  --muted: var(--tg-theme-hint-color, #667085);
  --subtitle: var(--tg-theme-subtitle-text-color, #667085);

  --primary: var(--tg-theme-button-color, #2f6df6);
  --on-primary: var(--tg-theme-button-text-color, #ffffff);
  --link: var(--tg-theme-link-color, #2f6df6);
  --danger: var(--tg-theme-destructive-text-color, #d92d4c);

  --success: #087a55;
  --success-soft: #eafaf3;

  --warning: #a45a00;
  --warning-soft: #fff5df;

  --danger-soft: #fff0f3;
  --info-soft: #edf3ff;
}
```

### 8.2. Semantik rang ishlatilishi

| Token | Maqsad | Misol |
|---|---|---|
| `primary` | asosiy action, aktiv navigatsiya | Bron qilish |
| `success` | tasdiqlangan yoki bo‘sh | Tasdiqlandi |
| `warning` | kutilmoqda yoki cheklangan | Kutilmoqda |
| `danger` | rad etish, bekor qilish | Rad etildi |
| `muted` | ikkilamchi matn | sana izohi |
| `info-soft` | tanlangan yoki platform ma’lumoti | aktiv chip |

### 8.3. Rang ishlatish qoidalari

- Matn kontrasti WCAG AA darajasida bo‘lishi kerak.
- Pastel fon ustida to‘q semantic text ishlatiladi.
- Qizil rang faqat xavfli yoki irreversible action uchun.
- Kutilayotgan so‘rovni bekor qilish solid soft-danger bo‘lishi mumkin.
- Tasdiqlangan bronni bekor qilish outline danger ko‘rinishda bo‘ladi.
- Primary gradient faqat hero yoki asosiy CTA’da ishlatiladi.
- Bir ekranda bir nechta yorqin gradient ishlatilmaydi.

---

## 9. Tipografiya

Asosiy font stack:

```css
font-family:
  Inter,
  ui-sans-serif,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### 9.1. Tipografik shkala

| Rol | O‘lcham | Line-height | Weight | Qo‘llanish |
|---|---:|---:|---:|---|
| Display | 34–48px | 1.0–1.05 | 850–880 | eng yaqin vaqt |
| Page title | 26–34px | 1.05 | 820–860 | Jadval, Profil |
| Section title | 18px | 1.25 | 760–800 | Hafta, Bo‘sh vaqtlar |
| Card title | 14–16px | 1.3 | 700–780 | karta sarlavhasi |
| Body | 14px | 1.45 | 400–500 | asosiy matn |
| Secondary | 12–13px | 1.4 | 400–600 | izoh, sana |
| Caption | 9–11px | 1.3 | 650–800 | badge, meta |

### 9.2. Tipografiya qoidalari

- Vaqt raqamlari `font-variant-numeric: tabular-nums`.
- Page title’da negative letter spacing qo‘llanadi.
- Secondary matn `muted` rangda.
- Tugma matni minimum 11px emas, asosiy tugmada 14px.
- Uzun sarlavhalarda `text-wrap: balance`.
- Uzun izohlarda `text-wrap: pretty`.
- All caps faqat eyebrow uchun.

---

## 10. Spacing tizimi

Asosiy 4px grid:

```text
4, 8, 12, 16, 20, 24, 32, 40
```

### 10.1. Tavsiya etilgan spacing

| Element | Qiymat |
|---|---:|
| Ekran horizontal padding | 12–16px |
| Karta ichki padding | 15–20px |
| Karta orasidagi gap | 10–14px |
| Section orasidagi gap | 20px |
| Header ichki padding | 9–12px |
| CTA balandligi | 48px |
| Icon button | 44×44px |
| Nav item | min 58px |
| Slot card | min 66px |
| Modal grid gap | 9–10px |

### 10.2. Touch target

Har bir interaktiv element:

- Minimum 44×44px
- Icon-only tugmalar ham 44×44px
- Chiplar minimum 42px balandlik
- CTA minimum 48px balandlik
- Slot kartalari minimum 66px balandlik

---

## 11. Radius tizimi

```css
--r-xs: 10px;
--r-sm: 14px;
--r-md: 20px;
--r-lg: 28px;
--r-xl: 34px;
```

### Qo‘llanish

| Radius | Element |
|---|---|
| 10px | kichik badge, step number |
| 14px | icon button, chip |
| 20px | asosiy kartalar |
| 28px | hero card, bottom sheet |
| 34px | maxsus katta floating container |

Radiuslar komponent o‘lchamiga mutanosib ishlatiladi. Har bir elementni maksimal yumaloq qilish tavsiya etilmaydi.

---

## 12. Shadow va depth

### 12.1. Surface shadow

```css
box-shadow:
  0 0 0 1px rgba(0, 0, 0, .055),
  0 1px 2px -1px rgba(0, 0, 0, .07),
  0 8px 26px rgba(31, 45, 74, .07);
```

### 12.2. Hover shadow

```css
box-shadow:
  0 0 0 1px rgba(0, 0, 0, .075),
  0 2px 4px -1px rgba(0, 0, 0, .08),
  0 12px 32px rgba(31, 45, 74, .10);
```

### 12.3. Glass shadow

```css
box-shadow:
  0 0 0 1px rgba(0, 0, 0, .055),
  0 1px 2px -1px rgba(0, 0, 0, .08),
  0 12px 34px rgba(31, 45, 74, .10);
```

Shadow dekoratsiya emas, depth hierarchy uchun ishlatiladi:

1. Background
2. Surface card
3. Sticky glass navigation
4. Bottom sheet
5. Toast

---

## 13. Layout tizimi

### 13.1. Mobile-first

Asosiy target: 320–480px kenglikdagi Telegram viewport.

```css
.app {
  width: min(100%, 820px);
  margin: 0 auto;
  padding:
    var(--safe-top)
    var(--safe-right)
    calc(var(--nav-height) + var(--safe-bottom) + 24px)
    var(--safe-left);
}
```

### 13.2. Telegram safe-area

Quyidagi env qiymatlar ishlatiladi:

```css
--tg-content-safe-area-inset-top
--tg-content-safe-area-inset-right
--tg-content-safe-area-inset-bottom
--tg-content-safe-area-inset-left
```

Fallback sifatida `env(safe-area-inset-*)` ishlatiladi.

### 13.3. Tablet yoki keng ekran

680px dan yuqorida:

- Hero card va “Qanday ishlaydi?” yonma-yon.
- Slot grid 4 ustun.
- Duration grid 3 ustun.
- Maksimal content width 820px.

Desktop layout alohida dashboardga aylantirilmaydi. Mini App konteksti saqlanadi.

---

## 14. Header

### 14.1. Tuzilishi

```text
[Avatar] [Ism + subtitle]                 [Help] [Requests badge]
```

### 14.2. Xatti-harakat

- Sticky.
- Telegram safe-area’dan pastda joylashadi.
- Glass effect faqat performance yetarli bo‘lsa.
- User photo Telegram `initDataUnsafe.user.photo_url` orqali olinadi.
- Photo bo‘lmasa initials ko‘rsatiladi.
- Badge faqat pending so‘rovlar soni > 0 bo‘lsa ko‘rinadi.

### 14.3. Help button

Help bosilganda:

1. Jadval ekraniga o‘tadi.
2. “Qanday ishlaydi?” detail ochiladi.
3. Ushbu blok markazga scroll qilinadi.
4. Light haptic feedback ishlaydi.

### 14.4. Requests shortcut

- Pending count badge ko‘rsatadi.
- Bosilganda “So‘rovlarim” ekraniga o‘tadi.
- Badge pending so‘rovlar sonidan hisoblanadi.

---

## 15. Bottom navigation

### 15.1. Itemlar

- Jadval
- So‘rovlarim
- Profil

### 15.2. Aktiv holat

- Primary rang.
- Soft info background.
- Icon morph: default outline’dan active filled variantga.
- Label weight oshadi.
- `aria-current="page"` ishlatiladi.

### 15.3. Motion

Icon o‘tishi:

```css
transition:
  opacity 260ms,
  scale 260ms,
  filter 260ms;
```

Inactive icon:

```css
opacity: 0;
scale: .25;
filter: blur(4px);
```

Active icon:

```css
opacity: 1;
scale: 1;
filter: blur(0);
```

### 15.4. Telegram talablariga moslashish

Bottom nav:

- Safe-area bottom’dan yuqorida.
- Kichik ekranlarda viewport’ni yopmaydi.
- Content pastki padding bilan nav balandligini hisobga oladi.

---

## 16. Jadval ekrani

### 16.1. Maqsad

Foydalanuvchi eng kam qaror bilan mos vaqt topishi kerak.

### 16.2. Ekran ierarxiyasi

1. Page intro
2. Eng yaqin bo‘sh vaqt
3. Qanday ishlaydi?
4. Hafta tanlash
5. Kun bo‘limi filtrlari
6. Band vaqtlarni ko‘rsatish switch’i
7. Slot grid

### 16.3. Eng yaqin bo‘sh vaqt kartasi

Ko‘rsatadi:

- “Eng yaqin bo‘sh vaqt”
- Bugun yoki hafta kuni
- Vaqt
- To‘liq sana
- “Bron qilish” CTA

Algoritm:

```text
Har bir kunni ketma-ket tekshir:
  har bir 30 daqiqalik slotni tekshir
  agar:
    slot o‘tmagan bo‘lsa
    band bo‘lmasa
    minimum davomiylik sig‘sa
  birinchi mos slotni next available sifatida ko‘rsat
```

### 16.4. “Qanday ishlaydi?” bloki

- `<details>` va `<summary>` ishlatiladi.
- Default yopiq bo‘lishi mumkin.
- Birinchi tashrifda ochiq ko‘rsatish variant sifatida test qilinadi.
- Uchta qisqa bosqich:
  1. Kun va vaqt
  2. Davomiylik
  3. Admin tasdig‘i

### 16.5. Hafta tanlash

Horizontal scroll:

```text
Yak 12
Dush 13
Sesh 14
Chor 15
Pay 16
Jum 17
Shan 18
```

Tanlangan kun:

- Primary gradient.
- Oq text.
- “Bugun” caption.
- `aria-selected="true"`.

Kun tanlanganda:

- Slotlar qayta hisoblanadi.
- Tanlangan time reset qilinadi.
- Haptic selection feedback.
- Tanlangan item centerga scroll bo‘ladi.

### 16.6. Kun bo‘limlari

Filtrlar:

- Hammasi
- Ertalab
- Kunduzi
- Kechqurun

Vaqt segmentlari:

```text
Ertalab: 08:00–11:59
Kunduzi: 12:00–16:59
Kechqurun: 17:00–22:59
```

Ilova ochilganda joriy vaqtga mos bo‘lim avtomatik tanlanadi.

### 16.7. Band vaqtlarni ko‘rsatish switch’i

Default: `false`

Sabab:

- Foydalanuvchi asosan bo‘sh vaqt izlaydi.
- Band slotlar visual noise yaratadi.
- Kontekst kerak bo‘lsa switch orqali ochiladi.

### 16.8. Slot holatlari

#### Available

- Oq surface.
- Vaqt katta.
- Eng qisqa tugash vaqti kichik matnda.
- Hover’da success soft.
- Bosilganda modal ochiladi.

#### Busy

- Muted text.
- Neutral background.
- Owner yoki band nomi ko‘rsatiladi.
- Disabled.

#### Own

- Primary soft background.
- “Sizning so‘rovingiz” yoki “Sizning broningiz”.
- Disabled.
- Primary text.

#### Limited

- Warning soft background.
- Diagonal subtle pattern.
- “Kam vaqt”.
- Disabled.

#### Past

- Muted.
- Past opacity.
- “O‘tgan”.
- Disabled.

---

## 17. Slot availability logikasi

### 17.1. Ish vaqti

```text
08:00–23:00
```

### 17.2. Slot intervali

```text
30 daqiqa
```

### 17.3. Davomiyliklar

```text
60, 90, 120, 150, 180 daqiqa
```

### 17.4. Davomiylik validatsiyasi

Davomiylik yaroqli bo‘lishi uchun:

1. Tugash vaqti 23:00 dan oshmasligi.
2. Band interval bilan kesishmasligi.
3. Foydalanuvchining pending yoki approved bronlari bilan kesishmasligi.
4. Boshlanish vaqti o‘tib ketmagan bo‘lishi.

Pseudo-code:

```js
function validDurations(start, day) {
  const startMinutes = toMinutes(start);
  const closing = 23 * 60;

  if (isPastTime(start, day)) return [];

  return DURATIONS.filter(({ minutes }) => {
    const end = startMinutes + minutes;

    if (end > closing) return false;

    return !blockedIntervals(day).some((busy) =>
      overlaps(
        startMinutes,
        end,
        toMinutes(busy.start),
        toMinutes(busy.end)
      )
    );
  });
}
```

---

## 18. Bron qilish bottom sheet

### 18.1. Ochilish

Slot bosilganda:

- Bottom sheet ochiladi.
- Backdrop blur.
- Body scroll lock.
- Telegram BackButton ko‘rinadi.
- Telegram MainButton ishlatiladi.
- Light haptic.

### 18.2. Tuzilishi

```text
[drag handle]

Bron qilish                         [X]
Davomiylikni tanlang...

[Selected date + time hero]

Qancha vaqt o‘ynaysiz?
[1 soat] [90 daqiqa]
[2 soat] [150 daqiqa]
[3 soat]

Sana     Yakshanba, 12-iyul
Vaqt     19:30–20:30
Jarayon  Admin tasdig‘i kerak

[So‘rov yuborish]
```

### 18.3. Davomiylik kartalari

Har bir duration card:

- Davomiylik label.
- Start–end oralig‘i.
- Tanlangan holatda 2px primary inset border.
- Yaroqsiz bo‘lsa disabled.
- Bosilganda haptic selection.

### 18.4. Yopish usullari

- X tugmasi.
- Backdrop click.
- Escape.
- Telegram BackButton.
- Modal yopilganda Telegram MainButton yashiriladi.

### 18.5. Submit

Telegram ichida:

- WebApp `MainButton`.
- Text: `So‘rov yuborish · 19:30–20:30`
- Loading progress.
- Submit tugmasi modal ichida yashiriladi.

Brauzer preview’da:

- Modal ichidagi primary button ishlaydi.

### 18.6. Success feedback

Submit’dan so‘ng:

- Pending request yaratiladi.
- Jadval qayta hisoblanadi.
- Tanlangan vaqt “Sizning so‘rovingiz” bo‘ladi.
- Modal yopiladi.
- Success haptic.
- Toast:
  - Sarlavha: “So‘rov yuborildi”
  - Sana + vaqt
  - “Ko‘rish” action

---

## 19. So‘rovlarim ekrani

### 19.1. Filtrlar

- Barchasi
- Kutilmoqda
- Tasdiqlandi
- Rad etildi

Segmented control shaklida.

### 19.2. Request card anatomiyasi

```text
[14:00]  Chorshanba, 15-iyul       [Rad etildi]
[15:00]  60 daqiqa
         Qaror bergan admin...
```

### 19.3. Statuslar

#### Pending

- Amber soft background.
- “Kutilmoqda”.
- Solid soft-danger cancel button.
- Confirmation talab qilinmaydi.
- Cancel’dan keyin Undo toast.

#### Approved

- Green soft background.
- “Tasdiqlandi”.
- Outline danger cancel button.
- Confirmation talab qilinadi.

#### Rejected

- Red soft background.
- “Rad etildi”.
- Action yo‘q.
- Admin yoki sabab izohi ko‘rsatiladi.

### 19.4. Bekor qilish xatti-harakati

#### Pending request

```text
Cancel → request removed → toast + Undo
```

Undo 5.2 soniya davomida mavjud.

#### Approved booking

```text
Cancel → destructive confirm → remove → warning toast
```

Telegram ichida `showPopup` ishlatiladi. Browser’da `window.confirm`.

### 19.5. Empty state

Filtr natijasi bo‘sh bo‘lsa:

- Calendar icon.
- “Bu holatda so‘rov yo‘q”
- Qisqa izoh.
- “Jadvalga o‘tish” CTA.

---

## 20. Profil ekrani

### 20.1. Profil kartasi

Ko‘rsatadi:

- Avatar.
- Ism.
- Telefon.
- Tasdiqlangan hisob badge.

Avatar:

- Telegram photo URL bo‘lsa rasm.
- Aks holda initials.

### 20.2. Statistika

To‘rtta qiymat:

- Jami
- Tasdiq
- Kutilyapti
- Rad

Mobil kichik ekranda 2×2 grid.

### 20.3. Sozlamalar

#### Telegram bot

- Deep-link.
- Ism yoki telefonni yangilash.

#### Til

- Hozircha O‘zbekcha.
- Kelajakda til selector.

#### Ko‘rinish

- Telegram mavzusiga avtomatik moslashadi.
- Manual light/dark switch defaultda yo‘q.

#### Yordam

- Support Telegram username.
- Telegram ichida `openTelegramLink`.

---

## 21. Telegram Mini App integratsiyasi

### 21.1. SDK

```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

### 21.2. Init

```js
tg.ready();
tg.expand();
```

### 21.3. Theme params

Quyidagi CSS fallbacklar ishlatiladi:

```css
var(--tg-theme-bg-color)
var(--tg-theme-text-color)
var(--tg-theme-hint-color)
var(--tg-theme-button-color)
var(--tg-theme-button-text-color)
var(--tg-theme-secondary-bg-color)
var(--tg-theme-section-bg-color)
var(--tg-theme-subtitle-text-color)
var(--tg-theme-destructive-text-color)
var(--tg-theme-bottom-bar-bg-color)
```

### 21.4. Native controls

| Telegram API | Vazifa |
|---|---|
| `MainButton` | bron so‘rovini yuborish |
| `BackButton` | modal yoki secondary screen’dan qaytish |
| `SettingsButton` | profilni ochish |
| `HapticFeedback` | selection, impact, success, warning |
| `showPopup` | destructive confirmation |
| `openTelegramLink` | support yoki bot link |
| `themeChanged` | ranglarni real-time yangilash |

### 21.5. BackButton logic

```text
Agar modal ochiq:
  modalni yop
Aks holda secondary screen:
  Jadvalga qayt
Aks holda:
  BackButton yashirin
```

### 21.6. MainButton logic

```text
Modal ochilganda:
  ko‘rsat
  vaqt oralig‘ini textga qo‘sh
  enabled
Modal yopilganda:
  yashir
```

---

## 22. Motion design

### 22.1. Maqsad

Motion foydalanuvchiga:

- navigatsiya qayerga o‘tganini,
- qaysi item tanlanganini,
- action bajarilganini,
- modal qayerdan kelganini

tushuntirishi kerak.

### 22.2. CSS transition

Interruptible interactionlar uchun:

- Tugma press.
- Chip selection.
- Nav icon morph.
- Switch.
- Bottom sheet.
- Toast.

### 22.3. GSAP

Faqat page enter animatsiyalarida:

```js
gsap.fromTo(
  items,
  {
    opacity: 0,
    y: 12,
    filter: "blur(4px)"
  },
  {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    duration: .38,
    stagger: .055,
    ease: "power2.out"
  }
);
```

### 22.4. Duration qoidalari

| Interaction | Duration |
|---|---:|
| Press scale | 150ms |
| Chip/select | 150–170ms |
| Nav icon morph | 260ms |
| Bottom sheet | 280ms |
| Toast | 230ms |
| Screen enter | 380ms |

### 22.5. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: .001ms !important;
    transition-duration: .001ms !important;
  }
}
```

GSAP ham reduced-motion bo‘lsa ishlatilmaydi.

---

## 23. Liquid glass qoidalari

### 23.1. Qayerda ishlatiladi

- Header
- Bottom navigation

### 23.2. Qayerda ishlatilmaydi

- Slot kartalari
- Request kartalari
- Uzun text kontent
- Form elementlari
- Statistik kartalar

### 23.3. Glass formula

```css
background: rgba(255,255,255,.70);
backdrop-filter: blur(20px) saturate(155%);
```

### 23.4. Fallback

Quyidagi holatlarda blur o‘chiriladi:

- `prefers-reduced-transparency`
- Low-memory Android
- `backdrop-filter` support yo‘q

Fallback: solid surface.

---

## 24. Accessibility

### 24.1. Touch accessibility

- 44px minimum target.
- Icon-only tugmada `aria-label`.
- Disabled slotlar fokuslanmaydi.
- Segmented controls’da `aria-selected`.

### 24.2. Keyboard

- Escape modalni yopadi.
- Focus-visible outline mavjud.
- Modal ochilganda close button fokuslanadi.
- Tab order vizual oqimga mos.

### 24.3. Screen reader

- Slotlar to‘liq `aria-label` bilan.
- Status faqat rangga bog‘liq emas.
- Toast `role="status"` va `aria-live="polite"`.
- Bottom nav `aria-current="page"`.
- Date strip `role="listbox"` va `role="option"`.

### 24.4. Contrast

- Body text: minimum 4.5:1.
- Large text: minimum 3:1.
- Disabled elementlar kontrasti past bo‘lishi mumkin, lekin label tushunarli bo‘lishi kerak.
- Primary button text kontrasti alohida tekshiriladi.

### 24.5. Text scaling

200% text zoom’da:

- CTA matni kesilmasligi.
- Request card mobile layoutga o‘tishi.
- Stat grid 2 ustunga o‘tishi.
- Bottom nav label ellipsis bo‘lishi mumkin, lekin icon saqlanadi.

---

## 25. Offline va loading holatlari

### 25.1. Offline

Top banner:

```text
Internet aloqasi yo‘q
```

- Network holati `navigator.onLine` orqali.
- Offline bo‘lsa submit disabled qilinishi tavsiya etiladi.
- Data cache mavjud bo‘lsa jadval read-only ko‘rsatiladi.

### 25.2. Loading

Jadval loading holatida:

- Skeleton slot grid.
- 6–8 placeholder.
- Shimmer minimal.
- 1.2–1.5s dan uzun loading bo‘lsa status text.

### 25.3. Submit loading

- Telegram MainButton progress.
- Browser fallback’da button disabled.
- Double submit bloklanadi.

### 25.4. Error

Error toast:

```text
So‘rov yuborilmadi
Internetni tekshirib qayta urinib ko‘ring.
[Qayta urinish]
```

---

## 26. Content design

### 26.1. Tone

- Qisqa.
- Hurmatli.
- Amaliy.
- Texnik jargon yo‘q.
- Foydalanuvchini ayblamaydi.

### 26.2. CTA qoidalari

Yaxshi:

- Bron qilish
- So‘rov yuborish
- So‘rovni bekor qilish
- Qaytarish
- Jadvalga o‘tish

Yomon:

- OK
- Davom etish
- Submit
- Yes
- Confirm

### 26.3. Error copy

Yaxshi:

> Bu vaqt endi band. Boshqa slotni tanlang.

Yomon:

> Error 409.

### 26.4. Status copy

- Kutilmoqda
- Tasdiqlandi
- Rad etildi
- Sizning so‘rovingiz
- Sizning broningiz
- Kam vaqt
- O‘tgan

---

## 27. Data modeli

### 27.1. Slot

```ts
type SlotStatus =
  | "available"
  | "busy"
  | "own"
  | "limited"
  | "past";

interface Slot {
  date: string;
  time: string;
  period: "morning" | "afternoon" | "evening";
  status: SlotStatus;
  title?: string;
  validDurations: number[];
}
```

### 27.2. Request

```ts
type RequestStatus =
  | "pending"
  | "approved"
  | "rejected";

interface BookingRequest {
  id: string;
  date: string;
  dateLabel: string;
  start: string;
  end: string;
  status: RequestStatus;
  note?: string;
  createdAt?: string;
  adminName?: string;
}
```

### 27.3. User

```ts
interface MiniAppUser {
  id: number;
  firstName: string;
  lastName?: string;
  phone?: string;
  photoUrl?: string;
  isVerified: boolean;
  joinedAt?: string;
}
```

---

## 28. Backend interaction tavsiyasi

### 28.1. Jadval endpoint

```http
GET /api/availability?from=2026-07-12&to=2026-07-18
```

Response:

```json
{
  "timezone": "Asia/Tashkent",
  "slotIntervalMinutes": 30,
  "openingTime": "08:00",
  "closingTime": "23:00",
  "days": []
}
```

### 28.2. Yangi so‘rov

```http
POST /api/booking-requests
```

Body:

```json
{
  "date": "2026-07-12",
  "start": "19:30",
  "durationMinutes": 90
}
```

### 28.3. Conflict handling

Agar so‘rov yuborilish vaqtida slot band bo‘lib qolsa:

```http
409 Conflict
```

UI:

1. Error toast.
2. Jadval refetch.
3. Band bo‘lgan slot “Band” holatiga o‘tadi.
4. Modal yopilmaydi yoki yaroqli variantlar qayta hisoblanadi.

---

## 29. Performance

### 29.1. Maqsadlar

| Ko‘rsatkich | Maqsad |
|---|---:|
| Initial HTML | < 100 KB compressed |
| First meaningful paint | < 1.5s |
| Interaction delay | < 100ms |
| Main thread long task | < 50ms |
| Blur layer count | ≤ 2 |
| Active animation count | minimal |

### 29.2. Tavsiyalar

- GSAP faqat zarur animatsiya uchun.
- Iconlar inline SVG.
- Font remote load shart emas.
- Avatar lazy load.
- Availability data cache.
- Heavy backdrop-filter faqat header va nav’da.
- Low-memory Android’da blur o‘chiriladi.
- `will-change` doimiy ishlatilmaydi.

---

## 30. Responsive qoidalar

### 320–389px

- Slot grid: 2 ustun.
- Request filter horizontal scroll.
- Profile center layout.
- Stats 2×2.
- Request card stacked.

### 390–559px

- Slot grid: 3 ustun.
- Request card 2 qatorli responsive layout.
- Duration grid 2 ustun.

### 560–679px

- Request card desktop-like.
- Stats 4 ustun.
- Slot grid 3 ustun.

### 680px+

- Hero va onboarding yonma-yon.
- Slot grid 4 ustun.
- Duration grid 3 ustun.
- Content max-width 820px.

---

## 31. Edge cases

Quyidagi holatlar alohida test qilinadi:

1. Barcha slotlar band.
2. Bugungi barcha slotlar o‘tib ketgan.
3. 22:30 da faqat 30 daqiqa qolgan.
4. 19:30 dan keyin 20:00 da band bron bor.
5. Foydalanuvchining pending so‘rovi mavjud.
6. Foydalanuvchi bir vaqtning o‘zida ikki marta submit qiladi.
7. Backend 409 conflict qaytaradi.
8. Internet submit paytida uziladi.
9. Telegram user rasmi yo‘q.
10. Ism juda uzun.
11. Telefon yo‘q.
12. Pending badge 9 dan katta.
13. Dark mode’da warning va danger kontrasti.
14. Text scaling 200%.
15. Landscape orientation.
16. Bottom safe-area juda katta qurilma.
17. `backdrop-filter` support yo‘q.
18. GSAP CDN yuklanmagan.
19. Telegram SDK mavjud emas.
20. Brauzer preview rejimi.

---

## 32. QA checklist

### Visual

- [ ] Light mode barcha ekranlar.
- [ ] Dark mode barcha ekranlar.
- [ ] 320px viewport.
- [ ] 390px viewport.
- [ ] 430px viewport.
- [ ] 768px viewport.
- [ ] Safe-area overlap yo‘q.
- [ ] Bottom nav kontentni yopmaydi.
- [ ] Modal MainButton bilan overlap qilmaydi.
- [ ] Long name overflow to‘g‘ri.

### Interaction

- [ ] Har bir kun tanlanadi.
- [ ] Period filter ishlaydi.
- [ ] Band vaqt switch’i ishlaydi.
- [ ] O‘tgan slot disabled.
- [ ] Busy slot disabled.
- [ ] Duration conflict disabled.
- [ ] Submit bir marta ishlaydi.
- [ ] Pending request jadvalni bloklaydi.
- [ ] Undo requestni qaytaradi.
- [ ] Approved cancel confirmation ishlaydi.
- [ ] Telegram BackButton modalni yopadi.
- [ ] Telegram MainButton submit qiladi.

### Accessibility

- [ ] Keyboard navigation.
- [ ] Focus visible.
- [ ] Screen reader label.
- [ ] Color-only signal yo‘q.
- [ ] Reduced motion.
- [ ] Reduced transparency.
- [ ] Minimum touch size.
- [ ] Text contrast.

### Performance

- [ ] Low-memory fallback.
- [ ] Blur layerlar ≤ 2.
- [ ] No layout shift.
- [ ] No long task.
- [ ] Offline banner.
- [ ] GSAP fallback.

---

## 33. Implementatsiya prioritetlari

### P0 — Majburiy

- Telegram theme params
- Safe-area
- Jadval va slot validatsiyasi
- Modal duration logic
- MainButton va BackButton
- Request statuslari
- Cancel va undo
- Accessibility
- Mobile responsiveness

### P1 — Muhim

- Haptic feedback
- Offline banner
- Skeleton loading
- Conflict handling
- Support deep-link
- Dark mode QA
- Analytics events

### P2 — Keyingi bosqich

- Multi-language
- Push notification
- Calendar export
- Recurring booking
- Favorite duration
- Admin chat
- Price/payment
- Waiting list

---

## 34. Analytics eventlari

```text
miniapp_open
schedule_date_selected
schedule_period_selected
show_unavailable_enabled
slot_selected
booking_sheet_opened
duration_selected
booking_request_submitted
booking_request_success
booking_request_conflict
request_filter_selected
pending_request_cancelled
pending_request_undo
approved_booking_cancelled
profile_opened
telegram_bot_opened
support_opened
```

Event payload misoli:

```json
{
  "event": "duration_selected",
  "date": "2026-07-12",
  "start": "19:30",
  "duration_minutes": 90,
  "theme": "dark",
  "platform": "android"
}
```

Shaxsiy ma’lumot analytics’ga yuborilmaydi.

---

## 35. Security va privacy

- Telegram `initData` backend’da tekshiriladi.
- `initDataUnsafe` autentifikatsiya uchun ishlatilmaydi.
- Foydalanuvchi ID clientdan ishonchli deb qabul qilinmaydi.
- Bron so‘rovi serverda qayta validatsiya qilinadi.
- Slot conflict server-side tekshiriladi.
- Telefon raqami loglarga yozilmaydi.
- Telegram linklar trusted domain bilan.
- XSS uchun user-generated text escape qilinadi.

---

## 36. Dizayn qarorlari xulosasi

Ushbu dizaynning asosiy kuchi quyidagilarda:

1. **Tezlik:** eng yaqin bo‘sh vaqt birinchi ekranda.
2. **Xatoni oldini olish:** yaroqsiz duration tanlab bo‘lmaydi.
3. **Past visual noise:** band vaqtlar default yashirin.
4. **Aniq status:** rang + matn + action hierarchy.
5. **Platform mosligi:** Telegram theme, safe-area va native controls.
6. **Xavfsiz destructive action:** pending uchun undo, approved uchun confirmation.
7. **Performance:** glass faqat ikki qatlamda.
8. **Accessibility:** touch target, focus, ARIA, reduced motion.
9. **Responsive:** mobile-first va mini-app format saqlangan.
10. **Tushunarli feedback:** haptic, toast va status update.

---

## 37. Developer handoff

### Asosiy fayllar

```text
DESIGN.md
bronqilish-telegram-miniapp-max-ux.html
```

### Ishga tushirish

Statik server orqali:

```bash
python -m http.server 8080
```

Brauzer:

```text
http://localhost:8080/bronqilish-telegram-miniapp-max-ux.html
```

Telegram test uchun HTTPS hosting talab qilinadi.

### Placeholder almashtirish

Quyidagilar real qiymatlar bilan almashtiriladi:

```text
your_bot_username
your_support_username
```

### Productionga ko‘chirishdan oldin

- Mock data olib tashlanadi.
- Backend endpoint ulanadi.
- Telegram initData verification qo‘shiladi.
- Error handling qo‘shiladi.
- Analytics qo‘shiladi.
- Real timezone ishlatiladi.
- Request conflict server-side tekshiriladi.
- Accessibility audit qilinadi.
- Android va iOS Telegram client’da test qilinadi.

---

## 38. Final design principle

> BronQilish foydalanuvchiga “jadvalni boshqarish” vazifasini bermaydi. Ilova foydalanuvchi uchun mavjud variantlarni tushunarli qilib saralaydi va faqat xavfsiz tanlovlarni qoldiradi.

Bu mahsulot uchun eng muhim UX natija — foydalanuvchi qaysi tugmani bosishni o‘ylab qolmasligi, lekin har bir action natijasini oldindan tushunishi.
