import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainPage } from "./MainPage";
import { AdminPage } from "./AdminPage";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/*" element={<MainPage />} />
      </Routes>
    </BrowserRouter>
  );
}
