import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

/* Simple email pattern — good enough for client-side UX validation */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [emailVerification, setEmailVerification] = useState(false);
  const location = useLocation();
  const [invalidLink, setInvalidLink] = useState(false);

  const isValid = EMAIL_RE.test(email.trim());
  const showError = touched && email.trim() !== "" && !isValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    // UI-only: no API call. Just flip into the success state.
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_MAGIC_LINK}`,
        {
          email: email,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (response.status === 200) {
        setSent(true);
      }
    } catch (error) {
      console.error(error);
    }
  };
  const handleVerifyLink = async (email, token) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_VERIFY}`,
        {
          email: email,
          token: token,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (response.status === 200) {
        setEmailVerification(false);
        
      }
    } catch (error) {
      console.error(error);

      setEmailVerification(false);
      setInvalidLink(true);
    }
  };
  useEffect(() => {
    if (location.pathname.includes("/verify-email")) {
      setEmailVerification(true);
      const query = new URLSearchParams(location.search);
      const foundEmail = query.get("email");
      const token = query.get("token");
      // setEmail(foundEmail);
      // setToken(token);
      handleVerifyLink(foundEmail, token);
    }
  }, [location]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-100 px-4 py-12 text-slate-800 antialiased">
      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="animate-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-300/40 blur-3xl" />
        <div className="animate-blob absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl [animation-delay:4s]" />
        <div className="animate-blob absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl [animation-delay:8s]" />
      </div>

      <div className="animate-fade-in-up relative z-10 w-full max-w-md">
        {emailVerification ? (
          <>
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-xl shadow-slate-200/70">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
              <p className="mt-6 text-base font-semibold text-slate-900">
                Verifying your login…
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                Hold on while we confirm your secure link.
              </p>
            </div>
          </>
        ) : !invalidLink && (
          <>
            {/* Brand */}
            <div className="mb-10 flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/40">
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Enter your email and we'll send you a secure login link.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/70">
              {sent ? (
                /* ---------------------------- Success state --------------------------- */
                <div className="animate-fade-in-up flex flex-col items-center py-4 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/30">
                    <svg
                      className="h-8 w-8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    Login link sent!
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    We've sent a login link to{" "}
                    <span className="font-medium text-slate-700">
                      {email.trim()}
                    </span>
                    . Check your inbox to continue.
                  </p>
                  <button
                    onClick={() => {
                      setSent(false);
                      setEmail("");
                      setTouched(false);
                    }}
                    className="mt-6 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                /* ------------------------------ Form state ---------------------------- */
                <form onSubmit={handleSubmit} noValidate>
                  <label htmlFor="email" className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Email Address
                    </span>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-10 5L2 7" />
                        </svg>
                      </span>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus
                        aria-invalid={showError}
                        aria-describedby={showError ? "email-error" : undefined}
                        className={`w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                          showError
                            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                            : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100"
                        }`}
                      />
                    </div>
                  </label>

                  {showError && (
                    <p
                      id="email-error"
                      className="mt-1.5 text-xs font-medium text-rose-600"
                    >
                      Please enter a valid email address.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!isValid}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    Send Login Link
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </form>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              By continuing you agree to our Terms & Privacy Policy.
            </p>
          </>
        )}
        {/* Brand */}
        {invalidLink && (
          <>
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-xl shadow-slate-200/70">
               <p className="mt-6 text-base font-semibold text-slate-900">
                Invalid or Expired Link...
              </p>
               <p className="mt-2 text-base font-semibold text-slate-900">
                Please Contact Admin
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
