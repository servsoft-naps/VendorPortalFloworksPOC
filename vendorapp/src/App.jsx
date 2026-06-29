import { useState, useEffect } from "react";
import Employee from "./views/Employee";
import AadhaarValidation from "./views/AadhaarValidation";
import Login from "./views/Login";
import "./styles/custom.css";
import { Routes, Route, useLocation } from "react-router-dom";

function App() {
  const [view, setView] = useState("employees");
  const location = useLocation();
  const isLoginPage =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/verify-email");

  // useEffect(() => {
  //   if (location.pathname.includes("/verify-email")) {
  //     isLoginPage = true;
  //   }
  // }, [location]);
  return (
    <>
      {/* <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <button
          onClick={() => setView("employees")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            view === "employees"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Employees
        </button>
        <button
          onClick={() => setView("aadhaar")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            view === "aadhaar"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Aadhaar Validation
        </button>
        <button
          onClick={() => setView("login")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            view === "login"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Login
        </button>
      </div> */}
      {!isLoginPage && <>{view === "employees" && <Employee />}</>}
      {view === "aadhaar" && <AadhaarValidation />}
      {/* {view === "login" && <Login />} */}
      {isLoginPage && (
        <div className="min-h-screen w-full overflow-hidden">
          <>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/verify-email" element={<Login />} />
            </Routes>
          </>
        </div>
      )}
    </>
  );
}

export default App;
