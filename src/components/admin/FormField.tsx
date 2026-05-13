interface Props {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, required, hint, error, children }: Props) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-ls-secondary uppercase tracking-wide mb-xs">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[11px] text-ls-secondary mt-xs">{hint}</span>}
      {error && <span className="block text-[11px] text-red-600 mt-xs">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary bg-white";
