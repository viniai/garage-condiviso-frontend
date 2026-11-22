import { BrowserRouter, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./auth/session";
import AdminPage from "./pages/AdminPage";
import ClaimPage from "./pages/ClaimPage";
import DaPartePage from "./pages/DaPartePage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import PrivacyPage from "./pages/PrivacyPage";
import ProfilePage from "./pages/ProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import RestauroPage from "./pages/RestauroPage";
import TermsPage from "./pages/TermsPage";
import VehicleDiaryPage from "./pages/VehicleDiaryPage";
import VerifyPage from "./pages/VerifyPage";

function Layout() {
  const tab = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : undefined);
  return (
    <div className="shell">
      <Outlet />
      <nav className="tabbar" aria-label="Navigazione principale">
        <NavLink to="/" end className={tab}>Mappa</NavLink>
        <NavLink to="/restauro" className={tab}>Restauro</NavLink>
        <NavLink to="/da-parte" className={tab}>Da parte</NavLink>
        <NavLink to="/profilo" className={tab}>Profilo</NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<MapPage />} />
            <Route path="restauro" element={<RestauroPage />} />
            <Route path="restauro/:id" element={<VehicleDiaryPage />} />
            <Route path="da-parte" element={<DaPartePage />} />
            <Route path="profilo" element={<ProfilePage />} />
            <Route path="p/:handle" element={<PublicProfilePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="auth/verify" element={<VerifyPage />} />
            <Route path="claim" element={<ClaimPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="termini" element={<TermsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
