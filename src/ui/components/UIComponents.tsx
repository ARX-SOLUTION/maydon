/** @jsxImportSource hono/jsx */
import type { FC, PropsWithChildren } from "hono/jsx";

export const AppShell: FC = ({ children }) => (
  <div class="min-h-dvh text-crm-textMain pb-[104px] w-full max-w-[480px] mx-auto overflow-x-hidden">
    {children}
  </div>
);

export const PageHeader: FC<
  { title: string; subtitle?: string; rightNode?: any }
> = ({ title, subtitle, rightNode }) => (
  <div class="px-5 pt-6 pb-4 bg-crm-surface/95 backdrop-blur-md rounded-b-[24px] shadow-soft mb-5 sticky top-0 z-40 tma-safe-top">
    <div class="flex justify-between items-center gap-4">
      <div class="min-w-0">
        <h1 class="text-[22px] font-extrabold tracking-normal leading-tight">
          {title}
        </h1>
        {subtitle
          ? (
            <p class="text-crm-textMuted text-[14px] mt-1 font-medium">
              {subtitle}
            </p>
          )
          : null}
      </div>
      {rightNode ? <div class="shrink-0">{rightNode}</div> : null}
    </div>
  </div>
);

export const MetricCard: FC<
  { title: string; value: string; subtitle?: string; highlight?: boolean }
> = ({ title, value, subtitle, highlight }) => (
  <div class="bg-crm-surface p-4 rounded-[24px] shadow-soft flex flex-col justify-center">
    <span class="text-[13px] font-semibold text-crm-textMuted mb-1.5 uppercase tracking-wide">
      {title}
    </span>
    <span
      class={`text-[22px] font-extrabold tabular-nums ${
        highlight ? "text-crm-primary" : "text-crm-textMain"
      }`}
    >
      {value}
    </span>
    {subtitle
      ? (
        <span
          class={`text-[12px] font-medium mt-1 ${
            subtitle.includes("+") ? "text-crm-success" : "text-crm-textMuted"
          }`}
        >
          {subtitle}
        </span>
      )
      : null}
  </div>
);

export const StatusBadge: FC<{ status: string; label: string }> = (
  { status, label },
) => {
  let classes =
    "px-[10px] h-[26px] inline-flex items-center rounded-full text-[12px] font-semibold whitespace-nowrap ";

  if (status === "paid" || status === "success") {
    classes += "bg-crm-successSoft text-crm-success";
  } else if (status === "debt" || status === "danger") {
    classes += "bg-crm-dangerSoft text-crm-danger";
  } else if (status === "trial" || status === "warning") {
    classes += "bg-crm-warningSoft text-crm-warning";
  } else if (status === "pending" || status === "info") {
    classes += "bg-crm-primarySoft text-crm-primary";
  } else classes += "bg-crm-borderSoft text-crm-textMuted";

  return <span class={classes}>{label}</span>;
};

export const Card: FC<PropsWithChildren<{ class?: string; id?: string }>> = (
  { children, class: className = "", id },
) => (
  <div
    class={`bg-crm-surface rounded-[24px] p-4 shadow-soft flex flex-col gap-3 ${className}`}
    id={id}
  >
    {children}
  </div>
);

export const InnerCard: FC<PropsWithChildren<{ class?: string }>> = (
  { children, class: className = "" },
) => (
  <div
    class={`bg-crm-surfaceSoft rounded-[16px] p-3 flex flex-col gap-2 ${className}`}
  >
    {children}
  </div>
);

type ButtonProps = PropsWithChildren<
  {
    variant?: "primary" | "secondary" | "danger";
    class?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  } & Record<string, any>
>;

export const Button: FC<ButtonProps> = (
  {
    variant = "primary",
    children,
    class: className = "",
    type = "button",
    ...props
  },
) => {
  let base =
    "min-h-[48px] min-w-[44px] rounded-[16px] font-bold text-[15px] tap-scale focus-ring flex items-center justify-center gap-2 px-4 disabled:opacity-45 ";

  if (variant === "primary") {
    base += "bg-crm-primary text-white shadow-floating hover:brightness-110 ";
  } else if (variant === "secondary") {
    base += "bg-crm-surfaceSoft text-crm-textMain hover:bg-gray-200 ";
  } else if (variant === "danger") {
    base += "bg-crm-dangerSoft text-crm-danger hover:bg-red-200 ";
  }

  return (
    <button type={type} class={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
};
