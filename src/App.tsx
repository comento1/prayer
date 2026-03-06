/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import Onboarding from "./pages/Onboarding";
import GroupSelect from "./pages/GroupSelect";
import Feed from "./pages/Feed";
import CreatePrayer from "./pages/CreatePrayer";
import PrayerDetail from "./pages/PrayerDetail";
import MyPrayers from "./pages/MyPrayers";
import Search from "./pages/Search";
import BottomNav from "./components/BottomNav";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="pb-20 min-h-screen">
      {children}
      <BottomNav />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();
        if (!contentType.includes("application/json")) return;
        try {
          const data = JSON.parse(text);
          console.log("Server health:", data);
        } catch (_) {}
      })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/groups" element={<GroupSelect />} />

        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreatePrayer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prayers/:id"
          element={
            <ProtectedRoute>
              <PrayerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my"
          element={
            <ProtectedRoute>
              <MyPrayers />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
