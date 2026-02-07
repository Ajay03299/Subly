import { InternalNavbar } from "@/components/internal-navbar";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InternalNavbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
