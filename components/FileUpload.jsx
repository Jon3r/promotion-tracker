"use client";

export default function FileUpload({
  label,
  description,
  fileName,
  error,
  info,
  onFile,
  onClear,
}) {
  const inputId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="min-w-0 rounded-xl border border-dashed border-zinc-300 bg-white p-4 shadow-sm sm:p-5">
      <label htmlFor={inputId} className="block cursor-pointer">
        <span className="text-sm font-semibold text-zinc-900">{label}</span>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
        <input
          id={inputId}
          type="file"
          accept=".xlsx,.xls"
          className="mt-3 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
      {fileName && (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-zinc-700">Loaded: {fileName}</span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-red-600 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      )}
      {info && !error && (
        <p className="mt-2 text-sm text-amber-800">{info}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
