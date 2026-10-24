import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Header } from './components/Header';
import { UnlockModal } from './components/UnlockModal';
import { ZipProvider } from './state';

const Landing = lazy(() => import('./pages/Landing'));
const Pool = lazy(() => import('./pages/Pool'));
const Book = lazy(() => import('./pages/Book'));
const Doorstep = lazy(() => import('./pages/Doorstep'));

function Loading() {
  return (
    <div className="wrap page">
      <p className="muted"><span className="spin" />Loading</p>
    </div>
  );
}

export default function App() {
  return (
    <ZipProvider>
      <Header />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pool" element={<Pool />} />
          <Route path="/book" element={<Book />} />
          <Route path="/doorstep" element={<Doorstep />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
      <UnlockModal />
    </ZipProvider>
  );
}
