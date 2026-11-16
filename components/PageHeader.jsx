import Image from "next/image";

/**
 * @param {{ title: string, children?: import('react').ReactNode, action?: import('react').ReactNode, centered?: boolean, largeTitle?: boolean }} props
 */
export default function PageHeader({
  title,
  children,
  action,
  centered = false,
  largeTitle = false,
}) {
  return (
    <header className="mb-8 border-b border-zinc-200 pb-6">
      <div
        className={`flex flex-col gap-4 sm:flex-row ${
          centered
            ? "items-center justify-center"
            : "sm:items-start sm:justify-between"
        }`}
      >
        <div
          className={`flex gap-4 ${
            centered ? "items-center justify-center" : "items-start"
          }`}
        >
          <Image
            src="/pja-logo.png"
            alt="Parramatta Jiu Jitsu Academy"
            width={80}
            height={80}
            className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20"
            priority
          />
          <div className={`min-w-0 ${centered ? "" : "pt-1"}`}>
            <h1
              className={`font-bold tracking-tight text-brand-blue break-words ${
                largeTitle
                  ? "text-3xl sm:text-5xl"
                  : "text-xl sm:text-3xl"
              }`}
            >
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
