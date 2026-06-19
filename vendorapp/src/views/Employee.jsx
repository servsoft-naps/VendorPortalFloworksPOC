import { useState, useMemo, useEffect } from "react";
import axios from "axios";
/* ------------------------------------------------------------------ */
/*  Inline icon set (no external dependency required)                 */
/* ------------------------------------------------------------------ */
const Icon = ({ path, className = "w-5 h-5", stroke = 1.8 }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);

const icons = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18M6 6l12 12" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </>
  ),
};

/* ------------------------------------------------------------------ */
/*  Seed data (demo) — replace with API data when wiring the backend  */
/* ------------------------------------------------------------------ */
const seed = [
  {
    id: 1,
    name: "John Carter",
    email: "john.carter@acme.io",
    department: "Engineering",
    status: "Active",
  },
  {
    id: 2,
    name: "Sophia Lin",
    email: "sophia.lin@acme.io",
    department: "Design",
    status: "Active",
  },
  {
    id: 3,
    name: "Marcus Reed",
    email: "marcus.reed@acme.io",
    department: "Sales",
    status: "Inactive",
  },
  {
    id: 4,
    name: "Ava Thompson",
    email: "ava.thompson@acme.io",
    department: "Marketing",
    status: "Active",
  },
  {
    id: 5,
    name: "Liam Nguyen",
    email: "liam.nguyen@acme.io",
    department: "Finance",
    status: "Inactive",
  },
];

const emptyForm = { name: "", email: "", department: "", status: "Active" };

function Employee() {
  // Original form state preserved + extended for status
  const [employee, setEmployee] = useState(emptyForm);
  const [employees, setEmployees] = useState(seed);

  // UI-only state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === "Active").length;
    const depts = new Set(employees.map((e) => e.department)).size;
    return {
      total: employees.length,
      active,
      inactive: employees.length - active,
      depts,
    };
  }, [employees]);

  const openAdd = () => {
    setEmployee(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (e) => {
    setEmployee({
      name: e.name,
      email: e.email,
      department: e.department,
      status: e.status,
    });
    setEditingId(e.id);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleChange = (field) => (ev) =>
    setEmployee((prev) => ({ ...prev, [field]: ev.target.value }));

  const handleSubmit = async () => {
    // if (!employee.name.trim() || !employee.email.trim()) return;
    // if (editingId) {
    //   setEmployees((list) =>
    //     list.map((e) => (e.id === editingId ? { ...e, ...employee } : e))
    //   );
    // } else {
    //   const id = employees.length ? Math.max(...employees.map((e) => e.id)) + 1 : 1;
    //   setEmployees((list) => [...list, { id, ...employee }]);
    // }
    try {
      if (editingId) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_UPDATE_EMPLOYEE}`,
          employee,
          {
            params: {
              id: editingId,
            },
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        alert("Employee updated successfully");
      } else {
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_ADD_EMPLOYEE}`,
          employee,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
      await getEmployees();

      setEditingId(null);

      setEmployee({
        name: "",
        email: "",
        department: "",
        status: "",
      });

      closeModal();
    } catch (error) {
      console.error(error);
    }
  };
  const getEmployees = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_GET_EMPLOYEES}`,
      );

      setEmployees(response.data);
    } catch (error) {
      console.error(error);
    }
  };
  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_DELETE_EMPLOYEE}`,
        {
          params: {
            id: id,
          },
        },
      );

      await getEmployees();
    } catch (error) {
      console.error(error);
    }
  };
  // setEmployees((list) => list.filter((e) => e.id !== id));

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: icons.dashboard },
    { key: "employees", label: "Employees", icon: icons.users, active: true },
    { key: "settings", label: "Settings", icon: icons.settings },
  ];
  useEffect(() => {
    getEmployees();
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex">
      {/* ----------------------------- Sidebar ----------------------------- */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 text-slate-300 p-5">
        <div className="flex items-center gap-3 px-2 py-3 mb-8">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/40">
            <Icon path={icons.building} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">Acme HR</p>
            <p className="text-xs text-slate-400">Vendor Portal</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                item.active
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon path={item.icon} className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-slate-800/60 p-4">
          <p className="text-sm font-medium text-white">Upgrade to Pro</p>
          <p className="mt-1 text-xs text-slate-400">
            Unlock advanced analytics & exports.
          </p>
          <button className="mt-3 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:opacity-90">
            Upgrade
          </button>
        </div>
      </aside>

      {/* --------------------------- Main column --------------------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Employees
            </h1>
            <p className="text-sm text-slate-500">
              Manage your team members and their roles
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon path={icons.search} className="w-4 h-4" />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-800">
              <Icon path={icons.bell} className="w-5 h-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
              AK
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stat cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Employees"
              value={stats.total}
              hint="+2 this month"
              icon={icons.users}
              tone="indigo"
            />
            <StatCard
              label="Active"
              value={stats.active}
              hint="Currently working"
              icon={icons.check}
              tone="emerald"
            />
            <StatCard
              label="Inactive"
              value={stats.inactive}
              hint="On leave / disabled"
              icon={icons.bell}
              tone="amber"
            />
            <StatCard
              label="Departments"
              value={stats.depts}
              hint="Across the org"
              icon={icons.building}
              tone="violet"
            />
          </section>

          {/* Table card */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Team Directory
                </h2>
                <p className="text-sm text-slate-500">
                  {filtered.length} member{filtered.length !== 1 && "s"} found
                </p>
              </div>
              <button
                onClick={openAdd}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:bg-indigo-700 hover:shadow-indigo-600/30 active:scale-[0.98]"
              >
                <Icon path={icons.plus} className="w-4 h-4" />
                Add Employee
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((e) => (
                    <tr
                      key={e.id}
                      className="group transition-colors duration-200 hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-600">
                            {e.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {e.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {e.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {e.department || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 transition-opacity duration-200 group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(e)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600"
                            aria-label="Edit"
                          >
                            <Icon path={icons.edit} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Delete"
                          >
                            <Icon path={icons.trash} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center">
                        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                          <Icon path={icons.search} className="w-6 h-6" />
                        </div>
                        <p className="font-medium text-slate-700">
                          No employees found
                        </p>
                        <p className="text-sm text-slate-500">
                          Try adjusting your search or add a new member.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* ----------------------------- Modal ----------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={closeModal}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-[popIn_.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Edit Employee" : "Add Employee"}
                </h3>
                <p className="text-sm text-slate-500">
                  {editingId
                    ? "Update the member's details."
                    : "Fill in the details to add a new member."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon path={icons.close} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <Field label="Full Name">
                <input
                  value={employee.name}
                  onChange={handleChange("name")}
                  type="text"
                  placeholder="e.g. Jane Doe"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </Field>

              <Field label="Email Address">
                <input
                  value={employee.email}
                  onChange={handleChange("email")}
                  type="email"
                  placeholder="e.g. jane@acme.io"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Department">
                  <input
                    value={employee.department}
                    onChange={handleChange("department")}
                    type="text"
                    placeholder="e.g. Engineering"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={employee.status}
                    onChange={handleChange("status")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98]"
              >
                <Icon path={icons.check} className="w-4 h-4" />
                {editingId ? "Save Changes" : "Add Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes for modal transitions */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */
function StatCard({ label, value, hint, icon, tone }) {
  const tones = {
    indigo: "from-indigo-500 to-violet-600 text-white",
    emerald: "from-emerald-500 to-teal-600 text-white",
    amber: "from-amber-400 to-orange-500 text-white",
    violet: "from-violet-500 to-fuchsia-600 text-white",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]} shadow-lg`}
        >
          <Icon path={icon} className="w-5 h-5" />
        </div>
      </div>
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-400">
        <Icon path={icons.trend} className="w-3.5 h-3.5 text-emerald-500" />
        {hint}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-500/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {status}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

export default Employee;
