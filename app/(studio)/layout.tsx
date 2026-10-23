import { Sidebar } from "@/components/shell/sidebar";
import { StudioBootstrap } from "@/components/shell/studio-bootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-glow flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StudioBootstrap />
        {children}
      </main>
    </div>
  );
}
