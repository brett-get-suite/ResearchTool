import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata = {
  title: 'PPC Recon — Google Ads Intelligence',
  description: 'AI-powered keyword research, competitor auditing, and low-hanging fruit discovery for trade contractors.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&family=Public+Sans:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface min-h-screen">
        <ThemeProvider>
          <Sidebar />
          <Header />
          <main className="ml-64 pt-16 min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
