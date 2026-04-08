import SidebarNav from './SidebarNav';
import TopNav from './TopNav';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <TopNav />
      <main
        className="pt-14 min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="max-w-content mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
