import './globals.css';

export const metadata = {
  title: 'Financial Copilot',
  description: 'Daily operations for F&B owners',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
