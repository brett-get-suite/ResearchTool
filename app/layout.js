import './globals.css';

export const metadata = {
  title: 'PPC Recon — Google Ads Research Tool',
  description: 'AI-powered keyword research, competitor auditing, and low-hanging fruit discovery for HVAC and plumbing clients.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
