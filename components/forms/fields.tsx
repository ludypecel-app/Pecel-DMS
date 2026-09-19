"use client";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, children }: FieldWrapperProps) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-neutral-700">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

interface TextFieldProps extends Omit<FieldWrapperProps, "children"> {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "tel" | "date";
  placeholder?: string;
}

export function TextField({ label, error, value, onChange, type = "text", placeholder }: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
      />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends Omit<FieldWrapperProps, "children"> {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, error, value, onChange, options }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
      >
        <option value="">Pilih...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
