"use client";

export default function TableFilterBar({
  title,
  subtitle,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  actions,
  className = "",
}) {
  const handleChange = (event) => {
    onSearchChange?.(event.target.value);
  };

  return (
    <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${className}`}>
      <div className="flex-1">
        {subtitle && (
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-muted)]">
            {subtitle}
          </p>
        )}
        {title && (
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">
            {title}
          </h1>
        )}
        {description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          value={searchValue ?? ""}
          onChange={handleChange}
          placeholder={searchPlaceholder}
          className="input-soft w-full sm:w-72"
        />
        {actions && (
          <div className="sm:ml-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

