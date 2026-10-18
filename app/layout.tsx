import './globals.css'
export const metadata = { title: 'FitCreator' }
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><script src="https://telegram.org/js/telegram-web-app.js" /><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" /></head><body>{children}</body></html>
}
