import { useState } from "react";
import Home from "./pages/Home";

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [role, setRole] = useState("Super Admin");

  return <Home activePage={activePage} setActivePage={setActivePage} role={role} setRole={setRole} />;
}
