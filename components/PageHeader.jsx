import Image from "next/image";

export default function PageHeader({ title, children, action }) {
  return (
    <header className="mb-8 border-b border-zinc-200 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Image
            src="/pja-logo.png"
            alt="Parramatta Jiu Jitsu Academy"
            width={80}
            height={80}
            className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20"
            priority
          />
          <div className="min-w-0 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {title}
            </h1>
            {children}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
