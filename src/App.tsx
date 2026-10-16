import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import NextCompetition from '@/components/NextCompetition';
import UpdateSection from '@/components/UpdateSection';
import Footer from '@/components/Footer';
import MarathonPage from '@/pages/MarathonPage';
import CompetitionDetailPage from '@/pages/CompetitionDetailPage';
import CompetitionsPage from '@/pages/CompetitionsPage';
import ParticipantDetailPage from '@/pages/ParticipantDetailPage';
import StandingsPage from '@/pages/StandingsPage';
import AdminPage from '@/pages/AdminPage';
import { DataStoreProvider } from '@/data/DataStore';

function HomePage() {
  return (
    <>
      <Hero />
      <UpdateSection />
      <NextCompetition />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <DataStoreProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-navy-950">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/tavlingar" element={<CompetitionsPage />} />
              <Route path="/poangstallning" element={<StandingsPage />} />
              <Route path="/tavling/:id" element={<CompetitionDetailPage />} />
              <Route path="/deltagare/:name" element={<ParticipantDetailPage />} />
              <Route path="/maraton" element={<MarathonPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </DataStoreProvider>
  );
}

export default App;
