"use client";

export default function CategoryTabs({ active, onChange, adultsCount, kidsCount }) {
  const tabs = [
    { id: "adults", label: "Adults", count: adultsCount },
    { id: "kids", label: "Kids", count: kidsCount },
  ];

  return (
    <div className="flex w-full min-w-0 gap-1 rounded-lg bg-zinc-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            active === tab.id
              ? "bg-white text-brand-blue shadow-sm"
              : "text-zinc-600 hover:text-brand-blue"
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
