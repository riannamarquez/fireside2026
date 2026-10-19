import { Navigate, Outlet, Route, Routes } from 'react-router'
import { DemoPanel } from './components/DemoPanel'
import { AppShell } from './components/ui/AppShell'
import Book from './pages/Book'
import Chapters from './pages/Chapters'
import Family from './pages/Family'
import LetterPage from './pages/Letter'
import LetterFlow from './pages/LetterFlow'
import LetterDetail from './pages/LetterDetail'
import Letterbox from './pages/Letterbox'
import Life from './pages/Life'
import Memories from './pages/Memories'
import PhoneRecord from './pages/PhoneRecord'
import QRPage from './pages/QRPage'
import Storytime from './pages/Storytime'

export default function App() {
  return (
    <>
      <Routes>
        {/* Redesigned screens (each renders its own AppShell) */}
        <Route path="/family" element={<Family />} />
        <Route path="/family/:code" element={<Family />} />
        <Route path="/life" element={<Life />} />
        <Route path="/letterbox" element={<Letterbox />} />
        <Route path="/letterbox/:id" element={<LetterDetail />} />
        {/* Recording = a letter: record → release decision → people check → P.S. → done */}
        <Route path="/record" element={<LetterFlow />} />
        <Route path="/letter/:id" element={<LetterPage />} />
        <Route path="/chapters" element={<Chapters />} />
        <Route path="/book" element={<Book />} />
        <Route path="/storytime/:memoId" element={<Storytime />} />

        {/* Phone page the QR code opens: no nav, just the record button. */}
        <Route path="/r" element={<PhoneRecord />} />

        {/* Kenza's pages */}
        <Route element={<LegacyLayout />}>
          <Route path="/memories" element={<Memories />} />
          <Route path="/qr" element={<QRPage />} />
        </Route>

        {/* old routes */}
        <Route path="/" element={<Navigate to="/family" replace />} />
        <Route path="/onboarding" element={<Navigate to="/life" replace />} />
        <Route path="/review" element={<Navigate to="/chapters" replace />} />
        <Route path="/read" element={<Navigate to="/book" replace />} />
        <Route path="*" element={<Navigate to="/family" replace />} />
      </Routes>
      {/* Demo controls for recording the video: tap the avatar in the header */}
      <DemoPanel />
    </>
  )
}

// Kenza's pages (Memories, QR) inside the shared shell; the menu links to everything else.
function LegacyLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
