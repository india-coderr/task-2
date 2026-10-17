import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { Navbar } from '../components/Navbar';

export const metadata = {
  title: 'Greenfield Grocers - Inventory & Sales Management',
  description: 'Retail inventory, point of sale, audit tracking, and financial reporting system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans">
        <AuthProvider>
          <SettingsProvider>
            <Navbar />
            <main className="flex-1 w-full max-w-[1280px] mx-auto p-4 sm:p-6">
              {children}
            </main>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
