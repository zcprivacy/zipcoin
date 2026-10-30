import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { UnlockModal } from './components/UnlockModal';
import { ZipProvider } from './state';

const Home = lazy(() => import('./pages/Home'));
const Pool = lazy(() => import('./pages/Pool'));
const Hook = lazy(() => import('./pages/Hook'));
const Builder = lazy(() => import('./pages/Builder'));
const Book = lazy(() => import('./pages/Book'));
const Doorstep = lazy(() => import('./pages/Doorstep'));
const Docs = lazy(() => import('./pages/Docs'));

function Loading() {
  return (
    <div className="page pad">
      <p className="muted mono"><span className="spin" />Loading</p>
    </div>
  );
}

/** Scroll to the top on route change, or to the hash target when there is one. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <ZipProvider>
      <ScrollManager />
      <Header />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pool" element={<Pool />} />
          <Route path="/hook" element={<Hook />} />
          <Route path="/hook/new" element={<Builder />} />
          <Route path="/book" element={<Book />} />
          <Route path="/doorstep" element={<Doorstep />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
      <Footer />
      <UnlockModal />
    </ZipProvider>
  );
}
