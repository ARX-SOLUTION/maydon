/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getSettings } from "../../../kv.ts";

const settingsScript = `
async function saveSettings(btn) {
  var payload = {
    openTime: document.getElementById('openTime')?.value || '08:00',
    closeTime: document.getElementById('closeTime')?.value || '23:00',
    horizonDays: Number(document.getElementById('horizonDays')?.value || 7),
    minDurMin: Number(document.getElementById('minDurMin')?.value || 60),
    maxDurMin: Number(document.getElementById('maxDurMin')?.value || 180),
    snapMin: Number(document.getElementById('snapMin')?.value || 30)
  };

  if (payload.minDurMin > payload.maxDurMin) {
    window.toast("Minimal davomiylik maksimaldan katta bo'lmasin", 'error');
    return;
  }

  var oldLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span> Saqlanmoqda...';
  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + initData,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    var data = await res.json();
    if (res.ok && data.success) {
      window.toast('Sozlamalar saqlandi', 'success');
      htmx.ajax('GET', '/app/admin/settings', '#app-content');
    } else {
      window.toast(data.error || 'Xatolik yuz berdi', 'error');
      btn.disabled = false;
      btn.innerHTML = oldLabel;
    }
  } catch (e) {
    window.toast('Xato: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = oldLabel;
  }
}

function backToBot() {
  if (window.Telegram?.WebApp) window.Telegram.WebApp.close();
  else window.toast("Telegram botda /admin buyrug'idan foydalaning", 'info');
}
`;

export const AdminSettings: FC = async () => {
  const settings = await getSettings() ?? {
    openTime: "08:00",
    closeTime: "23:00",
    horizonDays: 7,
    minDurMin: 60,
    maxDurMin: 180,
    snapMin: 30,
  };

  return (
    <AppShell>
      <PageHeader
        title="Sozlamalar"
        subtitle="Maydon qoidalari va admin amallari"
      />

      <div class="px-5 space-y-5">
        <div class="gsap-stagger">
          <h2 class="text-[15px] font-bold px-1 mb-2">Ish vaqti</h2>
          <Card class="p-4">
            <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <label
                  for="openTime"
                  class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                >
                  Ochilish
                </label>
                <input
                  id="openTime"
                  type="time"
                  value={settings.openTime}
                  step={settings.snapMin * 60}
                  class="w-full h-[46px] bg-crm-surfaceSoft rounded-[12px] px-3 text-[16px] font-bold tabular-nums border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                />
              </div>
              <div class="text-crm-textMuted pb-3 font-bold">-</div>
              <div>
                <label
                  for="closeTime"
                  class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                >
                  Yopilish
                </label>
                <input
                  id="closeTime"
                  type="time"
                  value={settings.closeTime}
                  step={settings.snapMin * 60}
                  class="w-full h-[46px] bg-crm-surfaceSoft rounded-[12px] px-3 text-[16px] font-bold tabular-nums border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                />
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-crm-borderSoft grid grid-cols-3 gap-2">
              <div>
                <label
                  for="horizonDays"
                  class="block text-[11px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                >
                  Gorizont
                </label>
                <input
                  id="horizonDays"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.horizonDays}
                  class="w-full h-[46px] bg-crm-surfaceSoft rounded-[12px] px-3 text-[15px] font-bold tabular-nums border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                />
              </div>
              <div>
                <label
                  for="minDurMin"
                  class="block text-[11px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                >
                  Min
                </label>
                <input
                  id="minDurMin"
                  type="number"
                  min="30"
                  step="30"
                  value={settings.minDurMin}
                  class="w-full h-[46px] bg-crm-surfaceSoft rounded-[12px] px-3 text-[15px] font-bold tabular-nums border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                />
              </div>
              <div>
                <label
                  for="maxDurMin"
                  class="block text-[11px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                >
                  Max
                </label>
                <input
                  id="maxDurMin"
                  type="number"
                  min="30"
                  step="30"
                  value={settings.maxDurMin}
                  class="w-full h-[46px] bg-crm-surfaceSoft rounded-[12px] px-3 text-[15px] font-bold tabular-nums border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                />
              </div>
            </div>

            <div class="mt-3">
              <label
                for="snapMin"
                class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
              >
                Qadam
              </label>
              <select
                id="snapMin"
                class="w-full h-[46px] bg-crm-surfaceSoft rounded-[12px] px-3 text-[15px] font-bold border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
              >
                {[15, 30, 60].map((snap) => (
                  <option value={snap} selected={settings.snapMin === snap}>
                    {snap} daqiqa
                  </option>
                ))}
              </select>
            </div>

            <button
              onclick="saveSettings(this)"
              class="w-full min-h-[48px] mt-4 rounded-[16px] bg-crm-primary text-white font-bold shadow-floating tap-scale focus-ring flex items-center justify-center gap-2"
            >
              <Icon name="check" class="w-5 h-5" /> Saqlash
            </button>
          </Card>
        </div>

        <div class="gsap-stagger">
          <h2 class="text-[15px] font-bold px-1 mb-2">Adminlar</h2>
          <Card class="p-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center shrink-0">
                <Icon name="settings" class="w-5 h-5" />
              </div>
              <div class="flex-1">
                <p class="text-[14px] font-bold text-crm-textMain">
                  Admin qo'shish bot orqali ishlaydi
                </p>
                <p class="text-[12px] text-crm-textMuted mt-1 leading-relaxed">
                  Owner admin Telegram botdagi admin buyruqlari orqali yordamchi
                  adminlarga invite beradi. Bu Mini App ichida xavfsizlik uchun
                  alohida rol boshqaruvi ochilmagan.
                </p>
              </div>
            </div>
            <button
              onclick="backToBot()"
              class="w-full min-h-[46px] rounded-[14px] bg-crm-surfaceSoft text-crm-primary font-bold tap-scale focus-ring flex items-center justify-center gap-2"
            >
              <Icon name="message" class="w-5 h-5" /> Botga qaytish
            </button>
          </Card>
        </div>

        <div class="gsap-stagger">
          <Card class="p-4 bg-crm-dangerSoft/45">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-crm-dangerSoft text-crm-danger flex items-center justify-center shrink-0">
                <Icon name="xCircle" class="w-5 h-5" />
              </div>
              <div>
                <p class="text-[14px] font-bold text-crm-textMain">
                  Bloklash amallari botda
                </p>
                <p class="text-[12px] text-crm-textMuted mt-1 leading-relaxed">
                  Foydalanuvchini bloklash ochiq ro'yxat emas, aniq Telegram ID
                  bo'yicha admin API orqali bajariladi.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div class="h-4"></div>
      </div>

      <script>{raw(settingsScript)}</script>
      <RoleBottomNav role="admin" activeId="settings" />
    </AppShell>
  );
};
