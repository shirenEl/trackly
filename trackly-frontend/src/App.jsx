import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const initialForm = {
  title: "",
  type: "movie",
  description: "",
  cover_url: "",
  status: "plan_to_watch",
  total_duration: "",
  current_duration: "",
  total_episodes: "",
  current_episode: "",
  total_pages: "",
  current_page: "",
  notes: "",
};

const statuses = [
  { value: "plan_to_watch", label: "Plan to Watch" },
  { value: "plan_to_read", label: "Plan to Read" },
  { value: "watching", label: "Watching" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "dropped", label: "Dropped" },
];

function readToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function normalizeList(result) {
  const data = result?.data ?? result;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.movies)) return data.movies;
  if (Array.isArray(data?.series)) return data.series;
  if (Array.isArray(data?.novels)) return data.novels;
  if (Array.isArray(data?.library)) return data.library;
  return [];
}

function progressOf(item) {
  if (item.type === "novel") {
    return {
      current: Number(item.current_page || 0),
      total: Number(item.total_pages || 0),
      unit: "halaman",
    };
  }

  if (item.type === "series") {
    return {
      current: Number(item.current_episode || 0),
      total: Number(item.total_episodes || 0),
      unit: "episode",
    };
  }

  return {
    current: Number(item.current_duration || 0),
    total: Number(item.total_duration || 0),
    unit: "menit",
  };
}

function percentOf(item) {
  const p = progressOf(item);
  if (item.status === "completed") return 100;
  if (!p.total) return 0;
  return Math.min(100, Math.round((p.current / p.total) * 100));
}

function App() {
  const [token, setToken] = useState(() => readToken());
  const [page, setPage] = useState("Dashboard");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(initialForm);

  async function request(path, options = {}) {
    const currentToken = readToken();
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(currentToken
          ? { Authorization: `Bearer ${currentToken}` }
          : {}),
        ...options.headers,
      },
    });

    const text = await response.text();
    let result = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = { message: text };
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("access_token");
        setToken("");
      }

      throw new Error(
        result.message || result.error || `Request gagal (${response.status})`
      );
    }

    return result;
  }

  async function loadItems() {
    setLoading(true);
    setError("");

    try {
      const result = await request("/library");
      setItems(normalizeList(result));
    } catch (libraryError) {
      try {
        const results = await Promise.all(
          ["/movies", "/series", "/novels"].map(async (path) => {
            try {
              return normalizeList(await request(path));
            } catch {
              return [];
            }
          })
        );

        const combined = results.flat();
        setItems(combined);

        if (!combined.length) {
          setError(
            `${libraryError.message}. Pastikan endpoint backend /library tersedia.`
          );
        }
      } catch (err) {
        setError(err.message || "Gagal mengambil data.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadItems();
  }, [token]);

  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const endpoint =
        authMode === "login" ? "/auth/login" : "/auth/register";

      const payload =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : authForm;

      const result = await request(endpoint, {
        method: "POST",
        headers: {},
        body: JSON.stringify(payload),
      });

      const data = result?.data ?? result;
      const newToken =
        data.token || data.accessToken || data.access_token;

      if (!newToken) {
        throw new Error(
          "Token tidak ditemukan pada respons backend. Periksa endpoint login."
        );
      }

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setPage("Dashboard");
    } catch (err) {
      setAuthError(err.message || "Login gagal. Periksa koneksi backend.");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("access_token");
    sessionStorage.clear();

    setToken("");
    setItems([]);
    setDetail(null);
    setModal(false);
    setPage("Dashboard");
    setAuthMode("login");
    setAuthForm({ name: "", email: "", password: "" });
    setAuthError("");
  }

  function openAdd(type = "movie") {
    setEditing(null);
    setForm({
      ...initialForm,
      type,
      status: type === "novel" ? "plan_to_read" : "plan_to_watch",
    });
    setModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ ...initialForm, ...item });
    setDetail(null);
    setModal(true);
  }

  async function saveItem(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    const payload = {
      ...form,
      total_duration: Number(form.total_duration || 0),
      current_duration: Number(form.current_duration || 0),
      total_episodes: Number(form.total_episodes || 0),
      current_episode: Number(form.current_episode || 0),
      total_pages: Number(form.total_pages || 0),
      current_page: Number(form.current_page || 0),
    };

    try {
      if (editing) {
        await request(`/library/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Data berhasil diperbarui.");
      } else {
        await request("/library", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Data berhasil ditambahkan.");
      }

      setModal(false);
      setEditing(null);
      await loadItems();
    } catch (err) {
      setError(err.message || "Gagal menyimpan data.");
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Hapus "${item.title}" dari Trackly?`)) return;

    try {
      await request(`/library/${item.id}`, { method: "DELETE" });
      setDetail(null);
      setNotice("Data berhasil dihapus.");
      await loadItems();
    } catch (err) {
      setError(err.message || "Gagal menghapus data.");
    }
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = (item.title || "")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesType =
        filter === "all" || item.type === filter;

      const matchesPage =
        page === "Dashboard" ||
        page === "My Library" ||
        (page === "Movies" && item.type === "movie") ||
        (page === "TV Series" && item.type === "series") ||
        (page === "Novels" && item.type === "novel");

      return matchesSearch && matchesType && matchesPage;
    });
  }, [items, search, filter, page]);

  const counts = {
    all: items.length,
    movie: items.filter((x) => x.type === "movie").length,
    series: items.filter((x) => x.type === "series").length,
    novel: items.filter((x) => x.type === "novel").length,
    completed: items.filter((x) => x.status === "completed").length,
    active: items.filter((x) =>
      ["watching", "reading"].includes(x.status)
    ).length,
  };

  if (!token) {
    return (
      <div className="auth-screen">
        <style>{styles}</style>
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />

        <section className="auth-layout">
          <div className="auth-intro">
            <div className="brand brand-light">
              <div className="brand-symbol">T</div>
              <span>trackly</span>
            </div>
            <div className="intro-copy">
              <span className="eyebrow">YOUR PERSONAL TRACKER</span>
              <h1>Every story.<br />One place.</h1>
              <p>
                Catat perjalanan menonton dan membaca. Simpan progres
                favoritmu, lalu lanjutkan kapan saja.
              </p>
              <div className="intro-points">
                <span>✦ Movie & TV Series</span>
                <span>✦ Novel Reading Progress</span>
                <span>✦ Your Personal Library</span>
              </div>
            </div>
            <div className="intro-bottom">YOUR JOURNEY, YOUR STORY.</div>
          </div>

          <div className="auth-panel">
            <div className="auth-mobile-brand">
              <div className="brand-symbol">T</div>
              <span>trackly</span>
            </div>

            <div className="auth-heading">
              <span className="eyebrow">WELCOME TO TRACKLY</span>
              <h2>
                {authMode === "login" ? "Welcome back!" : "Create account"}
              </h2>
              <p>
                {authMode === "login"
                  ? "Masuk ke akunmu untuk melanjutkan."
                  : "Buat akun dan mulai susun library-mu."}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                className={authMode === "login" ? "selected" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                type="button"
              >
                Login
              </button>
              <button
                className={authMode === "register" ? "selected" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
                type="button"
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "register" && (
                <label>
                  Nama lengkap
                  <input
                    value={authForm.name}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, name: e.target.value })
                    }
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, email: e.target.value })
                  }
                  placeholder="nama@email.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, password: e.target.value })
                  }
                  placeholder="Masukkan password"
                  minLength={6}
                  required
                />
              </label>

              {authError && <div className="error-message">{authError}</div>}

              <button
                className="primary-button auth-submit"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Memproses..."
                  : authMode === "login"
                    ? "Login ke Trackly →"
                    : "Buat Akun →"}
              </button>
            </form>

            <p className="auth-switch-copy">
              {authMode === "login"
                ? "Belum punya akun?"
                : "Sudah punya akun?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAuthError("");
                }}
              >
                {authMode === "login" ? "Daftar sekarang" : "Login"}
              </button>
            </p>

            <p className="auth-legal">
              Dengan melanjutkan, kamu setuju menggunakan Trackly secara bertanggung jawab.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const pageTitle =
    page === "Dashboard" ? "Your Library, Your Story" : page;

  return (
    <div className="app-shell">
      <style>{styles}</style>

      <aside className="sidebar">
        <div className="brand sidebar-brand">
          <div className="brand-symbol">T</div>
          <span>trackly</span>
        </div>

        <div className="nav-label">MENU UTAMA</div>
        {[
          ["Dashboard", "▦"],
          ["Movies", "▻"],
          ["TV Series", "▤"],
          ["Novels", "▧"],
          ["My Library", "▣"],
        ].map(([label, symbol]) => (
          <button
            key={label}
            className={`nav-item ${page === label ? "nav-active" : ""}`}
            onClick={() => setPage(label)}
          >
            <span className="nav-symbol">{symbol}</span>
            {label}
            {label === "My Library" && (
              <span className="nav-count">{counts.all}</span>
            )}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">✦</span>
            <strong>Keep your story going.</strong>
            <p>Small progress is still progress.</p>
          </div>
          <button className="logout-button" onClick={logout}>
            <span>↪</span> Logout
          </button>
          <div className="sidebar-version">TRACKLY · PERSONAL SPACE</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">TRACKLY <span>/</span> {page.toUpperCase()}</div>
          <div className="topbar-right">
            <div className="online-dot" />
            <span>My Space</span>
            <div className="avatar">T</div>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="notice notice-error">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {notice && (
            <div className="notice notice-success">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}

          <section className="welcome-row">
            <div>
              <span className="eyebrow">YOUR PERSONAL SPACE</span>
              <h1>{pageTitle}</h1>
              <p className="muted">
                Semua yang kamu tonton dan baca, tersimpan di satu tempat.
              </p>
            </div>
            <button className="primary-button add-main" onClick={() => openAdd()}>
              <span>＋</span> Add New
            </button>
          </section>

          {page === "Dashboard" && (
            <>
              <section className="hero-banner">
                <div className="hero-copy">
                  <span className="hero-tag">✦ YOUR JOURNEY CONTINUES</span>
                  <h2>One more chapter.<br />One more episode.</h2>
                  <p>
                    Lanjutkan cerita yang kamu suka, satu langkah setiap hari.
                  </p>
                  <button
                    className="hero-button"
                    onClick={() => setPage("My Library")}
                  >
                    Explore My Library <span>→</span>
                  </button>
                </div>
                <div className="hero-art">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-book">BOOK<br /><span>✦</span></div>
                  <div className="art-disc">PLAY</div>
                  <div className="art-star">✦</div>
                </div>
              </section>

              <section className="stats-grid">
                {[
                  ["Total Collection", counts.all, "Semua koleksi", "▦"],
                  ["Movies", counts.movie, "Film tersimpan", "▶"],
                  ["TV Series", counts.series, "Series tersimpan", "▤"],
                  ["Novels", counts.novel, "Buku tersimpan", "▧"],
                ].map(([label, value, caption, symbol]) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <span className="stat-icon">{symbol}</span>
                    </div>
                    <strong>{value}</strong>
                    <span className="stat-caption">{caption}</span>
                  </div>
                ))}
              </section>

              <section className="section-heading">
                <div>
                  <h2>Continue Your Journey</h2>
                  <p className="muted">Koleksi yang sedang kamu ikuti.</p>
                </div>
                <button className="text-button" onClick={() => setPage("My Library")}>
                  View all →
                </button>
              </section>
            </>
          )}

          {page !== "Dashboard" && (
            <section className="stats-strip">
              <div><strong>{filtered.length}</strong><span>Items found</span></div>
              <div><strong>{filtered.filter((x) => x.status === "completed").length}</strong><span>Completed</span></div>
              <div><strong>{filtered.filter((x) => ["watching", "reading"].includes(x.status)).length}</strong><span>In progress</span></div>
            </section>
          )}

          <section className="library-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul koleksi..."
              />
              {search && (
                <button onClick={() => setSearch("")}>×</button>
              )}
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter jenis koleksi"
            >
              <option value="all">Semua jenis</option>
              <option value="movie">Movies</option>
              <option value="series">TV Series</option>
              <option value="novel">Novels</option>
            </select>

            <button className="refresh-button" onClick={loadItems} title="Refresh">
              ↻
            </button>
          </section>

          <section className="collection-grid">
            {loading ? (
              <div className="empty-state">
                <div className="empty-symbol">↻</div>
                <h3>Memuat koleksi...</h3>
                <p>Tunggu sebentar ya.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-symbol">✦</div>
                <h3>Belum ada koleksi</h3>
                <p>Tambahkan film, series, atau novel untuk mulai melacak progresmu.</p>
                <button className="primary-button" onClick={() => openAdd()}>
                  ＋ Tambah koleksi pertama
                </button>
              </div>
            ) : (
              filtered.map((item) => {
                const progress = progressOf(item);
                const percentage = percentOf(item);
                return (
                  <article className="collection-card" key={item.id}>
                    <button
                      className="cover-button"
                      onClick={() => setDetail(item)}
                      title={`Lihat ${item.title}`}
                    >
                      {item.cover_url ? (
                        <img
                          className="cover-image"
                          src={item.cover_url}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="cover-placeholder"
                        style={{ display: item.cover_url ? "none" : "flex" }}
                      >
                        <span>{item.type === "novel" ? "▧" : item.type === "series" ? "▤" : "▶"}</span>
                        <small>{item.title}</small>
                      </div>
                      <span className="cover-type">
                        {item.type === "movie" ? "MOVIE" : item.type === "series" ? "TV SERIES" : "NOVEL"}
                      </span>
                    </button>

                    <div className="card-content">
                      <div className="card-title-row">
                        <button className="card-title" onClick={() => setDetail(item)}>
                          {item.title}
                        </button>
                        <button className="more-button" onClick={() => openEdit(item)} title="Edit">•••</button>
                      </div>

                      <span className={`status-pill status-${item.status}`}>
                        {statuses.find((s) => s.value === item.status)?.label || item.status}
                      </span>

                      <div className="progress-info">
                        <span>Progress</span>
                        <strong>{percentage}%</strong>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="progress-caption">
                        {progress.current} / {progress.total || "—"} {progress.unit}
                      </div>

                      <button
                        className="card-detail-button"
                        onClick={() => setDetail(item)}
                      >
                        Lihat detail <span>→</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <footer className="page-footer">
            <span>© 2026 Trackly</span>
            <span>Made for your stories. ✦</span>
          </footer>
        </div>
      </main>

      {modal && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setModal(false);
        }}>
          <form className="modal-card" onSubmit={saveItem}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">YOUR COLLECTION</span>
                <h2>{editing ? "Edit Collection" : "Add New Collection"}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>

            <div className="form-grid">
              <label className="field-full">
                Judul
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Masukkan judul"
                  required
                />
              </label>

              <label>
                Jenis
                <select
                  value={form.type}
                  onChange={(e) => setForm({
                    ...form,
                    type: e.target.value,
                    status: e.target.value === "novel" ? "plan_to_read" : "plan_to_watch",
                  })}
                >
                  <option value="movie">Movie</option>
                  <option value="series">TV Series</option>
                  <option value="novel">Novel</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {statuses.map((s) => <option value={s.value} key={s.value}>{s.label}</option>)}
                </select>
              </label>

              <label className="field-full">
                URL Cover (opsional)
                <input
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="https://..."
                />
              </label>

              {form.type === "novel" ? (
                <>
                  <label>
                    Total halaman
                    <input type="number" min="0" value={form.total_pages} onChange={(e) => setForm({ ...form, total_pages: e.target.value })} />
                  </label>
                  <label>
                    Sudah dibaca
                    <input type="number" min="0" value={form.current_page} onChange={(e) => setForm({ ...form, current_page: e.target.value })} />
                  </label>
                </>
              ) : form.type === "series" ? (
                <>
                  <label>
                    Total episode
                    <input type="number" min="0" value={form.total_episodes} onChange={(e) => setForm({ ...form, total_episodes: e.target.value })} />
                  </label>
                  <label>
                    Episode terakhir
                    <input type="number" min="0" value={form.current_episode} onChange={(e) => setForm({ ...form, current_episode: e.target.value })} />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Durasi total (menit)
                    <input type="number" min="0" value={form.total_duration} onChange={(e) => setForm({ ...form, total_duration: e.target.value })} />
                  </label>
                  <label>
                    Sudah ditonton (menit)
                    <input type="number" min="0" value={form.current_duration} onChange={(e) => setForm({ ...form, current_duration: e.target.value })} />
                  </label>
                </>
              )}

              <label className="field-full">
                Deskripsi
                <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tentang koleksi ini..." />
              </label>

              <label className="field-full">
                Catatan pribadi
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan..." />
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}
            <div className="modal-actions">
              {editing && (
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteItem(editing)}
                >
                  Hapus
                </button>
              )}
              <button type="button" className="cancel-button" onClick={() => setModal(false)}>Batal</button>
              <button className="primary-button" type="submit">
                {editing ? "Simpan perubahan" : "Tambah koleksi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setDetail(null);
        }}>
          <div className="detail-card">
            <button className="modal-close detail-close" onClick={() => setDetail(null)}>×</button>
            {detail.cover_url && <img className="detail-cover" src={detail.cover_url} alt={detail.title} />}
            <span className="eyebrow">{detail.type?.toUpperCase()}</span>
            <h2>{detail.title}</h2>
            <span className={`status-pill status-${detail.status}`}>
              {statuses.find((s) => s.value === detail.status)?.label || detail.status}
            </span>
            <p className="detail-description">{detail.description || "Belum ada deskripsi."}</p>

            <div className="detail-progress">
              <div className="progress-info">
                <span>Progress kamu</span>
                <strong>{percentOf(detail)}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${percentOf(detail)}%` }} />
              </div>
              <p>
                {progressOf(detail).current} dari {progressOf(detail).total || "—"} {progressOf(detail).unit}
              </p>
            </div>

            {detail.notes && <div className="detail-notes"><strong>Catatan</strong><p>{detail.notes}</p></div>}

            <div className="modal-actions">
              <button className="delete-button" onClick={() => deleteItem(detail)}>Hapus</button>
              <button className="primary-button" onClick={() => openEdit(detail)}>Edit koleksi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');

:root{font-family:'DM Sans',sans-serif;color:#202b40;background:#f7f8fc;font-synthesis:none;text-rendering:optimizeLegibility}
*{box-sizing:border-box}
body{margin:0}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
button:disabled{opacity:.6;cursor:not-allowed}
.auth-screen{min-height:100vh;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:38px;background:#f4f6fb}
.auth-decoration{position:absolute;border-radius:50%;pointer-events:none}
.auth-decoration-one{width:380px;height:380px;top:-210px;right:-80px;background:#e3eaff}
.auth-decoration-two{width:300px;height:300px;bottom:-190px;left:-80px;background:#e8e8ff}
.auth-layout{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;width:min(100%,1000px);min-height:630px;overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 25px 80px #243a6517}
.auth-intro{position:relative;display:flex;flex-direction:column;padding:42px 45px;color:#fff;background:linear-gradient(145deg,#173879,#2859bc 65%,#536be4);overflow:hidden}
.auth-intro:after{content:"";position:absolute;width:330px;height:330px;border:1px solid #ffffff20;border-radius:50%;right:-130px;bottom:40px;box-shadow:0 0 0 38px #ffffff08,0 0 0 78px #ffffff06}
.brand{display:flex;align-items:center;gap:11px;font-size:24px;font-weight:800;letter-spacing:-1px}
.brand-symbol{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#ffffff20;border:1px solid #ffffff35;font-size:23px;font-weight:800}
.intro-copy{position:relative;z-index:1;margin:auto 0}
.eyebrow{display:block;font-size:10px;letter-spacing:2px;font-weight:800;color:#7286bd}
.auth-intro .eyebrow{color:#b9ccff}
.intro-copy h1{font-family:Manrope,sans-serif;font-size:46px;line-height:1.14;letter-spacing:-2px;margin:18px 0}
.intro-copy>p{max-width:350px;color:#d9e3ff;font-size:13px;line-height:1.9}
.intro-points{display:grid;gap:15px;margin-top:30px;font-size:12px;color:#f0f4ff}
.intro-bottom{position:relative;z-index:1;color:#b8cbff;font-size:9px;letter-spacing:2px;font-weight:700}
.auth-panel{padding:55px 48px;display:flex;flex-direction:column;justify-content:center}
.auth-mobile-brand{display:none}
.auth-heading h2{font-family:Manrope,sans-serif;font-size:29px;letter-spacing:-1px;margin:12px 0 8px;color:#1c2942}
.auth-heading p,.muted{font-size:12px;line-height:1.7;color:#8490a5}
.auth-tabs{display:flex;gap:5px;margin:28px 0 22px;padding:4px;background:#f1f4fa;border-radius:10px}
.auth-tabs button{width:50%;border:0;background:transparent;padding:11px;border-radius:7px;color:#7b879b;font-weight:700;font-size:12px}
.auth-tabs button.selected{background:#fff;color:#2857b5;box-shadow:0 2px 8px #1a35630d}
.auth-form{display:grid;gap:17px}
.auth-form label,.form-grid label{display:grid;gap:8px;color:#3a465d;font-size:11px;font-weight:700}
.auth-form input,.form-grid input,.form-grid select,.form-grid textarea,.library-toolbar select{width:100%;border:1px solid #e1e6ef;background:#fff;border-radius:9px;padding:12px;color:#25334b;outline:none;font-size:12px}
.auth-form input:focus,.form-grid input:focus,.form-grid textarea:focus{border-color:#527ce2;box-shadow:0 0 0 3px #4776e911}
.primary-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:9px;background:#315fcb;color:#fff;padding:12px 17px;font-size:12px;font-weight:700;box-shadow:0 5px 12px #315fcb20}
.primary-button:hover{background:#244eae}
.auth-submit{width:100%;margin-top:5px;padding:14px}
.auth-switch-copy{text-align:center;color:#8490a5;font-size:11px;margin-top:23px}
.auth-switch-copy button{border:0;background:none;color:#315fcb;font-size:11px;font-weight:800}
.auth-legal{text-align:center;color:#a1a9b8;font-size:9px;margin-top:24px;line-height:1.6}
.error-message{background:#fff0f0;color:#b52e3b;padding:11px;border-radius:8px;font-size:11px;line-height:1.6;overflow-wrap:anywhere}
.app-shell{min-height:100vh;display:flex;background:#f7f8fc;color:#27334a}
.sidebar{position:fixed;inset:0 auto 0 0;width:226px;background:#fff;border-right:1px solid #edf0f5;padding:27px 17px;display:flex;flex-direction:column;z-index:5}
.sidebar-brand{padding:0 10px 34px;color:#244c9e}
.sidebar-brand .brand-symbol{background:#315fcb;color:#fff;border:0}
.nav-label{font-size:9px;letter-spacing:1.4px;color:#9aa4b6;font-weight:800;padding:0 12px;margin-bottom:12px}
.nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:0;background:transparent;color:#758198;text-align:left;border-radius:9px;font-size:12px;font-weight:600;margin:3px 0}
.nav-item:hover{background:#f5f7fc;color:#315fcb}
.nav-active{background:#edf2ff;color:#2c58b6;font-weight:800}
.nav-symbol{width:20px;text-align:center;font-size:17px}
.nav-count{margin-left:auto;background:#fff;border-radius:6px;padding:3px 6px;font-size:10px}
.sidebar-bottom{margin-top:auto}
.sidebar-note{margin:15px 3px 20px;padding:15px;border-radius:12px;background:linear-gradient(145deg,#f0f4ff,#f8f7ff)}
.note-icon{display:block;color:#416ad0;margin-bottom:10px}
.sidebar-note strong{font-size:11px;color:#35476c}
.sidebar-note p{font-size:10px;color:#8792a7;line-height:1.6}
.logout-button{display:flex;align-items:center;gap:11px;width:100%;border:0;border-radius:9px;background:#fff6f6;color:#bd5660;padding:12px;font-size:12px;font-weight:700}
.sidebar-version{font-size:8px;letter-spacing:1px;color:#a5adbc;text-align:center;margin-top:20px}
.main-content{width:calc(100% - 226px);margin-left:226px;min-width:0}
.topbar{height:65px;background:#fff;border-bottom:1px solid #edf0f5;display:flex;align-items:center;justify-content:space-between;padding:0 34px}
.breadcrumb{font-size:9px;font-weight:800;letter-spacing:1px;color:#8b96aa}
.breadcrumb span{padding:0 9px;color:#c5cbd5}
.topbar-right{display:flex;align-items:center;gap:10px;font-size:11px;color:#6f7c91}
.online-dot{width:7px;height:7px;border-radius:50%;background:#4cb88b}
.avatar{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:#eaf0ff;color:#315fcb;font-weight:800;margin-left:8px}
.page-content{max-width:1450px;margin:0 auto;padding:31px 34px}
.welcome-row{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}
.welcome-row h1{font-family:Manrope,sans-serif;font-size:27px;letter-spacing:-1px;margin:7px 0}
.welcome-row .muted{margin:0}
.add-main{white-space:nowrap}
.hero-banner{position:relative;display:flex;align-items:center;justify-content:space-between;min-height:230px;padding:30px 37px;border-radius:17px;overflow:hidden;color:#fff;background:linear-gradient(110deg,#183873,#2f5bc1 70%,#526ee1);margin-bottom:22px}
.hero-copy{position:relative;z-index:2}
.hero-tag{font-size:9px;font-weight:800;letter-spacing:1.4px;color:#c4d5ff}
.hero-copy h2{font-family:Manrope,sans-serif;font-size:28px;line-height:1.23;letter-spacing:-1px;margin:13px 0}
.hero-copy p{font-size:11px;color:#d5e0ff}
.hero-button{display:flex;align-items:center;gap:20px;margin-top:19px;padding:10px 14px;border:1px solid #ffffff45;border-radius:8px;background:#ffffff13;color:white;font-size:10px;font-weight:700}
.hero-art{position:absolute;width:300px;height:230px;right:40px;top:0;opacity:.95}
.art-orbit{position:absolute;width:205px;height:205px;border:1px solid #ffffff25;border-radius:50%;top:15px;right:23px}
.orbit-two{width:155px;height:155px;top:40px;right:48px}
.art-book{position:absolute;top:55px;right:123px;width:78px;height:111px;display:grid;place-content:center;text-align:center;line-height:1.5;border-radius:5px;background:linear-gradient(140deg,#ffca8c,#eaa1b0);color:#57446a;font-size:10px;font-weight:800;transform:rotate(-12deg);box-shadow:8px 12px 30px #111c4d55}
.art-book span{font-size:26px}
.art-disc{position:absolute;top:81px;right:44px;width:89px;height:89px;border:8px solid #c6d6ff;background:radial-gradient(circle,#dce5ff 0 9%,#5068c8 10% 14%,#243b84 15% 100%);border-radius:50%;display:grid;place-items:center;font-size:8px;letter-spacing:1px;box-shadow:0 10px 30px #111c4d55}
.art-star{position:absolute;top:38px;right:28px;font-size:24px;color:#ffdb9e}
.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:27px}
.stat-card{background:#fff;border:1px solid #edf0f5;border-radius:12px;padding:17px}
.stat-top{display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:10px;color:#77849a}
.stat-icon{display:grid;place-items:center;width:30px;height:30px;background:#eff3ff;border-radius:9px;color:#4167c6;font-size:15px}
.stat-card>strong{display:block;font-family:Manrope,sans-serif;font-size:26px;margin:12px 0 5px;color:#24344f}
.stat-caption{font-size:9px;color:#a0a9b8}
.section-heading{display:flex;align-items:center;justify-content:space-between;margin:4px 0 16px}
.section-heading h2{font-size:15px;margin:0 0 5px}
.section-heading p{margin:0}
.text-button{border:0;background:transparent;color:#315fcb;font-size:10px;font-weight:800}
.stats-strip{display:flex;gap:34px;padding:17px 20px;margin-bottom:21px;border:1px solid #edf0f5;background:#fff;border-radius:12px}
.stats-strip div{display:grid;gap:4px}
.stats-strip strong{font-size:20px;color:#2c4f9d}
.stats-strip span{font-size:10px;color:#8490a5}
.library-toolbar{display:flex;gap:10px;margin-bottom:17px}
.search-box{display:flex;align-items:center;gap:9px;flex:1;max-width:440px;padding:0 12px;border:1px solid #e8ebf2;border-radius:9px;background:#fff;color:#8592a7}
.search-box>span{font-size:22px}
.search-box input{flex:1;min-width:0;border:0;outline:none;background:transparent;padding:12px 0;font-size:11px;color:#26354c}
.search-box button{border:0;background:none;color:#7b879b}
.library-toolbar select{width:auto;min-width:125px}
.refresh-button{width:39px;border:1px solid #e1e6ef;border-radius:9px;background:#fff;color:#526887;font-size:19px}
.collection-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}
.collection-card{min-width:0;background:#fff;border:1px solid #e9edf4;border-radius:12px;overflow:hidden;transition:transform .18s,box-shadow .18s}
.collection-card:hover{transform:translateY(-2px);box-shadow:0 9px 25px #273f7010}
.cover-button{position:relative;display:block;width:100%;height:170px;padding:0;border:0;background:#e9efff;overflow:hidden;text-align:left}
.cover-image{width:100%;height:100%;object-fit:cover;display:block}
.cover-placeholder{height:100%;width:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:linear-gradient(135deg,#dce6ff,#e9e7fb 55%,#f5e4ef);color:#516cb2}
.cover-placeholder>span{font-size:34px}
.cover-placeholder small{max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:800}
.cover-type{position:absolute;left:10px;top:10px;padding:5px 7px;border-radius:5px;background:#ffffffdf;color:#3556a0;font-size:8px;font-weight:800;letter-spacing:.6px}
.card-content{padding:13px}
.card-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.card-title{padding:0;border:0;background:transparent;color:#26344d;font-size:12px;font-weight:800;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.more-button{border:0;background:transparent;color:#8390a5;letter-spacing:1px}
.status-pill{display:inline-block;margin-top:8px;padding:5px 7px;border-radius:5px;background:#f0f3f8;color:#758198;font-size:8px;font-weight:800}
.status-watching,.status-reading{background:#eaf2ff;color:#3b67bc}
.status-completed{background:#e5f7ef;color:#2c9872}
.status-on_hold{background:#fff3df;color:#ad7b2c}
.status-dropped{background:#fff0f0;color:#c35b66}
.progress-info{display:flex;align-items:center;justify-content:space-between;margin-top:15px;font-size:10px;color:#7d899e}
.progress-info strong{color:#345db9}
.progress-track{height:5px;margin-top:8px;border-radius:9px;background:#edf0f6;overflow:hidden}
.progress-fill{height:100%;border-radius:9px;background:linear-gradient(90deg,#315fcb,#7995ef);transition:width .25s}
.progress-caption{margin-top:7px;color:#9aa4b5;font-size:9px}
.card-detail-button{display:flex;justify-content:space-between;width:100%;margin-top:14px;padding:10px 0 0;border:0;border-top:1px solid #f0f2f7;background:transparent;color:#4366b7;font-size:10px;font-weight:700}
.empty-state{grid-column:1/-1;text-align:center;background:#fff;border:1px dashed #dce3ef;border-radius:14px;padding:46px 20px}
.empty-symbol{display:grid;place-items:center;margin:0 auto 14px;width:47px;height:47px;border-radius:14px;background:#eff3ff;color:#4168c9;font-size:23px}
.empty-state h3{font-size:15px;margin:0 0 8px}
.empty-state p{font-size:11px;color:#8994a8;margin-bottom:19px}
.page-footer{display:flex;justify-content:space-between;margin-top:33px;padding:18px 0;border-top:1px solid #e9edf4;color:#9aa4b5;font-size:9px}
.notice{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border-radius:9px;font-size:11px;overflow-wrap:anywhere}
.notice button{border:0;background:transparent;font-size:17px}
.notice-error{background:#fff0f0;color:#b52e3b}
.notice-success{background:#eaf8f1;color:#237d5d}
.modal-overlay{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:18px;background:#111c32a8;backdrop-filter:blur(4px);overflow-y:auto}
.modal-card,.detail-card{position:relative;width:min(100%,620px);max-height:92vh;overflow-y:auto;padding:26px;background:#fff;border-radius:16px;box-shadow:0 25px 90px #101a3340}
.modal-heading{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:23px}
.modal-heading h2,.detail-card h2{font-family:Manrope,sans-serif;font-size:22px;letter-spacing:-.6px;margin:7px 0}
.modal-close{width:31px;height:31px;border:0;border-radius:8px;background:#f1f3f8;color:#59677d;font-size:21px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.field-full{grid-column:1/-1}
.form-grid textarea{resize:vertical;line-height:1.6}
.modal-actions{display:flex;align-items:center;justify-content:flex-end;gap:9px;margin-top:23px}
.cancel-button,.delete-button{padding:11px 14px;border:1px solid #e2e6ef;border-radius:9px;background:#fff;color:#66748a;font-size:11px;font-weight:700}
.delete-button{margin-right:auto;border-color:#f3d9dc;color:#bb4d5a;background:#fff8f8}
.detail-card{width:min(100%,470px)}
.detail-close{position:absolute;right:20px;top:20px;z-index:2}
.detail-cover{display:block;width:100%;height:190px;object-fit:cover;border-radius:10px;margin-bottom:20px}
.detail-card h2{font-size:25px;margin-bottom:3px}
.detail-description,.detail-notes p{font-size:12px;color:#76839a;line-height:1.8}
.detail-progress{padding:14px;background:#f8f9fc;border-radius:10px;margin-top:18px}
.detail-progress .progress-info{margin:0}
.detail-progress>p{font-size:10px;color:#8490a5}
.detail-notes{margin-top:17px;font-size:11px}
.detail-notes strong{color:#3a4963}
@media(min-width:1500px){.collection-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.cover-button{height:190px}}
@media(max-width:1100px){.sidebar{width:195px}.main-content{width:calc(100% - 195px);margin-left:195px}.page-content{padding:25px 22px}.topbar{padding:0 22px}.collection-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-art{right:0;opacity:.65}.hero-copy{z-index:2}}
@media(max-width:760px){.auth-screen{padding:15px}.auth-layout{grid-template-columns:1fr;max-width:450px;min-height:0}.auth-intro{display:none}.auth-panel{padding:32px 25px}.auth-mobile-brand{display:flex;align-items:center;gap:10px;color:#244c9e;font-size:22px;font-weight:800;margin-bottom:30px}.auth-mobile-brand .brand-symbol{background:#315fcb;color:white}.sidebar{width:65px;padding:20px 7px}.sidebar-brand{padding:0 5px 28px;justify-content:center}.sidebar-brand>span,.nav-label,.nav-item:not(.nav-active),.nav-item{font-size:0}.nav-item{justify-content:center;padding:12px 5px}.nav-symbol{font-size:18px}.nav-active{font-size:0}.nav-count,.sidebar-note,.sidebar-version,.logout-button{display:none}.sidebar-bottom{margin-top:auto}.logout-button{display:flex;justify-content:center;font-size:0;padding:12px 5px}.logout-button span{font-size:18px}.main-content{margin-left:65px;width:calc(100% - 65px)}.topbar{height:56px;padding:0 13px}.topbar-right>span,.online-dot{display:none}.page-content{padding:22px 13px}.welcome-row{align-items:flex-start}.welcome-row h1{font-size:22px}.welcome-row .muted{max-width:260px}.add-main{padding:10px;font-size:10px}.hero-banner{min-height:210px;padding:23px 20px}.hero-copy h2{font-size:24px}.hero-copy p{max-width:230px;line-height:1.7}.hero-art{right:-100px;opacity:.28}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.stat-card{padding:13px}.stat-card>strong{font-size:23px}.collection-grid{grid-template-columns:1fr 1fr;gap:9px}.cover-button{height:125px}.card-content{padding:10px}.card-title{font-size:11px}.status-pill{font-size:7px}.library-toolbar{gap:6px}.library-toolbar select{min-width:0;width:100px;padding:10px 5px;font-size:10px}.search-box{padding:0 8px}.search-box input{font-size:10px}.refresh-button{width:32px}.stats-strip{gap:16px;padding:14px}.stats-strip strong{font-size:17px}.stats-strip span{font-size:9px}.form-grid{grid-template-columns:1fr}.field-full{grid-column:auto}.modal-card,.detail-card{padding:20px}.page-footer{font-size:8px}}
@media(max-width:390px){.collection-grid{grid-template-columns:1fr}.cover-button{height:165px}.welcome-row{flex-direction:column}.stats-strip{justify-content:space-between;gap:7px}.stats-strip span{font-size:8px}}
`;

export default App;
