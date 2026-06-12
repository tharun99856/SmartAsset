import "./globals.css";

export const metadata = {
  title: "SmartAsset | Campus Equipment Management",
  description: "Live inventory, clash-free bookings and QR check-in/out for shared campus equipment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
