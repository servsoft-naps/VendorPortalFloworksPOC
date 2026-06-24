import { useState, useRef } from "react";
import axios from "axios";

const ACCEPTED = ".pdf,image/png,image/jpeg";
const MAX_MB = 10;

function AadhaarValidation() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const pickFile = (f) => {
    setError(null);
    setResult(null);
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const handleDrop = (ev) => {
    ev.preventDefault();
    pickFile(ev.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please choose an Aadhaar card file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_VALIDATE_AADHAAR}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          "Could not validate the document. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Aadhaar Card Validation
          </h1>
          <p className="text-sm text-slate-500">
            Upload an Aadhaar card (PDF or image). The document is analysed and
            validated automatically.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition-colors duration-200 hover:border-indigo-400 hover:bg-indigo-50/30"
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <p className="font-medium text-slate-700">
            {file ? file.name : "Click to choose or drag & drop a file"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            PDF, PNG or JPEG · up to {MAX_MB} MB
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Validating…" : "Validate Document"}
          </button>
          {(file || result || error) && (
            <button
              onClick={reset}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 disabled:opacity-50"
            >
              Reset
            </button>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {result && <ResultCard result={result} />}
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const ok = result.is_valid;
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold ${
          ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
        />
        {ok ? "Valid Aadhaar card" : "Validation failed"}
      </div>

      <dl className="divide-y divide-slate-100">
        {!ok && result.extraction_failure_reason && (
          <Row label="Reason" value={result.extraction_failure_reason} />
        )}
        <Row label="Full Name" value={result.full_name} />
        <Row label="Date / Year of Birth" value={result.dob} />
        <Row label="Gender" value={result.gender} />
        <Row label="Aadhaar Number" value={result.mask_last_four_digits} />
      </dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-5 py-3 text-sm">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

export default AadhaarValidation;
