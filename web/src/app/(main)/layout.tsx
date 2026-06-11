import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { JEX_SUBTITLE } from "@/lib/constants";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site site--mobile-nav site--mobile-exam">
      <SiteHeader />
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE} — Junta de Extremadura</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
