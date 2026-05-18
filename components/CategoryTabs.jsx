"use client";

export default function CategoryTabs({ active, onChange, adultsCount, kidsCount }) {
  const tabs = [
    { id: "adults", label: "Adults", count: adultsCount },
    { id: "kids", label: "Kids", count: kidsCount },
  ];

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {tab.label}
          {tab.count != null && (
            <span className="ml-2 text-zinc-400">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
