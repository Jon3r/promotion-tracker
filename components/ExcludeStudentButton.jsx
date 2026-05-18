"use client";

export default function ExcludeStudentButton({ onClick, label = "Remove from list" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
      aria-label={label}
      title={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="h-4 w-4"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 3h6m-7 4h8m-9 4v9a1 1 0 001 1h10a1 1 0 001-1V11M10 11v6m4-6v6"
        />
      </svg>
    </button>
  );
}
