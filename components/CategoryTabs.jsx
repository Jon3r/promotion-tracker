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
          className={`group min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-4 ${
            active === tab.id
              ? "bg-white text-brand-blue shadow-sm ring-1 ring-zinc-200/90 hover:bg-brand-gold/20 hover:ring-brand-gold/60 hover:shadow-md"
              : "text-zinc-600 hover:bg-brand-gold hover:text-brand-blue hover:shadow-md hover:ring-1 hover:ring-brand-gold/80 active:scale-[0.98]"
          }`}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={`ml-2 text-zinc-400 transition-colors duration-200 group-hover:text-brand-blue/80`}
            >
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
