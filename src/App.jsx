import React, { useState, useEffect, useMemo } from "react";
import { auth, isConfigValid, authService, taskService, projectService } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  // --- React State Hooks ---
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Filtering
  const [activeProjectId, setActiveProjectId] = useState("inbox"); // 'inbox' means no specific project
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState([]);
  
  // Status dropdown tracker (TaskId or null)
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState(null);

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  
  // Creation Forms
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Planned");
  
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // --- Toast Manager ---
  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // --- Auth & Data Fetching ---
  useEffect(() => {
    if (!isConfigValid) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const [fetchedTasks, fetchedProjects] = await Promise.all([
            taskService.fetchTasks(currentUser.uid),
            projectService.fetchProjects(currentUser.uid)
          ]);
          setTasks(fetchedTasks);
          setProjects(fetchedProjects);
        } catch (error) {
          showToast("Failed to fetch data from database.", "error");
        }
      } else {
        setTasks([]);
        setProjects([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Click Outside to Close Dropdowns ---
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownTaskId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // --- Handlers ---
  const handleLogin = async () => {
    try {
      await authService.loginWithGoogle();
      showToast("Successfully logged in!", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const newProj = await projectService.createProject(user.uid, newProjectName.trim());
      setProjects((prev) => [...prev, newProj]);
      setNewProjectName("");
      setIsCreatingProject(false);
      setActiveProjectId(newProj.id);
      showToast("Project created successfully.", "success");
    } catch (err) {
      showToast("Failed to create project.", "error");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const targetProjectId = activeProjectId === "inbox" ? null : activeProjectId;
      const newTask = await taskService.createTask(user.uid, targetProjectId, title.trim(), description.trim(), status);
      setTasks((prev) => [newTask, ...prev]);
      setTitle("");
      setDescription("");
      setStatus("Planned");
      showToast("Task created successfully.", "success");
    } catch (err) {
      showToast("Failed to create task.", "error");
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(user.uid, taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
      );
      setActiveDropdownTaskId(null);
      showToast(`Task moved to ${newStatus}.`, "success");
    } catch (err) {
      showToast("Failed to update task status.", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await taskService.deleteTask(user.uid, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast("Task deleted.", "info");
    } catch (err) {
      showToast("Failed to delete task.", "error");
    }
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
  };

  const handleSaveEdit = async (taskId) => {
    if (!editTitle.trim()) {
      showToast("Task title cannot be blank.", "error");
      return;
    }
    try {
      await taskService.updateTaskDetails(user.uid, taskId, editTitle.trim(), editDesc.trim());
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, title: editTitle.trim(), description: editDesc.trim(), updatedAt: new Date().toISOString() } : t))
      );
      setEditingTaskId(null);
      showToast("Task updated successfully.", "success");
    } catch (err) {
      showToast("Failed to update task.", "error");
    }
  };

  // --- Real-time Local Filters (useMemo for maximum speed) ---
  const tasksInActiveProject = useMemo(() => {
    if (activeProjectId === "inbox") {
      // Inbox acts as a catch-all for tasks without a specific project assignment
      return tasks.filter((t) => !t.projectId);
    }
    return tasks.filter((t) => t.projectId === activeProjectId);
  }, [tasks, activeProjectId]);

  const filteredTasks = useMemo(() => {
    return tasksInActiveProject
      .filter((t) => filter === "all" || t.status === filter)
      .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tasksInActiveProject, filter, searchQuery]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    return {
      total: tasksInActiveProject.length,
      planned: tasksInActiveProject.filter(t => t.status === "Planned").length,
      inProgress: tasksInActiveProject.filter(t => t.status === "In Progress").length,
      complete: tasksInActiveProject.filter(t => t.status === "Complete").length,
    };
  }, [tasksInActiveProject]);

  const formatTaskDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  };

  const getActiveProjectName = () => {
    if (activeProjectId === "inbox") return "Inbox";
    const proj = projects.find(p => p.id === activeProjectId);
    return proj ? proj.name : "Project";
  };

  // --- Render Views ---
  if (!isConfigValid) {
    return (
      <div className="auth-screen-layout">
        <div className="auth-card">
          <div className="logo-section">
            <h1>Setup Required</h1>
            <p>Please configure your Firebase credentials.</p>
          </div>
          <div style={{ textAlign: "left", background: "var(--bg-dark)", padding: "1rem", borderRadius: "6px", fontSize: "0.85rem" }}>
            <p>1. Open <strong style={{color:"var(--text-main)"}}>.env</strong> in the project root.</p>
            <p style={{marginTop:"0.5rem"}}>2. Insert your Firebase parameters:</p>
            <pre style={{marginTop:"0.5rem", color:"var(--text-muted)", fontSize:"0.75rem"}}>
              VITE_FIREBASE_API_KEY=...<br/>
              VITE_FIREBASE_AUTH_DOMAIN=...
            </pre>
            <p style={{marginTop:"0.5rem"}}>3. Restart the Vite server.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="auth-screen-layout"><p style={{color: "var(--text-muted)"}}>Loading workspace...</p></div>;
  }

  if (!user) {
    return (
      <div className="auth-screen-layout">
        <div className="auth-card">
          <div className="logo-section">
            <h1>TaskFlow</h1>
            <p>Sign in to access your secure workspace.</p>
          </div>
          <div className="auth-buttons">
            <button onClick={handleLogin} className="btn-google">
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === MAIN DASHBOARD ===
  return (
    <div className="app-container">
      
      {/* --- LEFT SIDEBAR --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="app-brand">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            <h2>TaskFlow</h2>
          </div>
          <div className="user-profile-widget">
            <img src={user.photoURL} alt="Profile" className="user-avatar" referrerPolicy="no-referrer" />
            <div className="user-info">
              <span className="user-name">{user.displayName}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button onClick={() => authService.logout()} className="btn-logout" title="Log out">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>Projects</span>
            <button onClick={() => setIsCreatingProject(!isCreatingProject)} className="btn-add-project" title="Add Project">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          <div className="project-list">
            <button 
              className={`project-item ${activeProjectId === "inbox" ? "active" : ""}`}
              onClick={() => setActiveProjectId("inbox")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
              Inbox
            </button>

            {projects.map(p => (
              <button 
                key={p.id}
                className={`project-item ${activeProjectId === p.id ? "active" : ""}`}
                onClick={() => setActiveProjectId(p.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                {p.name}
              </button>
            ))}

            {isCreatingProject && (
              <form onSubmit={handleCreateProject} style={{ marginTop: "0.5rem" }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Project Name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="form-input"
                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", width: "100%" }}
                  onBlur={() => { if(!newProjectName) setIsCreatingProject(false); }}
                />
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* --- RIGHT DASHBOARD CONTENT --- */}
      <main className="main-content">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>{getActiveProjectName()}</h1>
            <p>Manage and track your workflow efficiently.</p>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-title">Total Tasks</span>
            <span className="metric-value">{metrics.total}</span>
          </div>
          <div className="metric-card">
            <span className="metric-title">Planned</span>
            <span className="metric-value" style={{color: "var(--text-muted)"}}>{metrics.planned}</span>
          </div>
          <div className="metric-card">
            <span className="metric-title">In Progress</span>
            <span className="metric-value">{metrics.inProgress}</span>
          </div>
          <div className="metric-card">
            <span className="metric-title">Complete</span>
            <span className="metric-value">{metrics.complete}</span>
          </div>
        </div>

        <div className="content-grid">
          {/* TASK CREATOR PANEL */}
          <aside className="panel-creator">
            <h3 className="panel-title">Add New Task</h3>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Audit security logs" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select 
                  className="form-input" 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  placeholder="Provide additional details..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                ></textarea>
              </div>

              <button type="submit" className="btn-submit" style={{ padding: "0.75rem" }}>
                Create Task
              </button>
            </form>
          </aside>

          {/* TASK LIST PANEL */}
          <section className="panel-viewer">
            <div className="controls-bar" style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "stretch" }}>
              {/* Search Bar */}
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search tasks in this project..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: "20px", padding: "0.5rem 1.25rem", background: "transparent" }}
              />

              {/* Filter Pills */}
              <div className="filters-wrapper">
                {["all", "Planned", "In Progress", "Complete"].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                    style={{ flex: "1", textAlign: "center" }}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Card List */}
            <div className="tasks-list">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <div key={task.id} className="task-card">
                    {editingTaskId === task.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={editTitle} 
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Task Title"
                          autoFocus
                        />
                        <textarea 
                          className="form-input" 
                          rows={2} 
                          value={editDesc} 
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description (Optional)"
                        />
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                          <button onClick={() => handleSaveEdit(task.id)} className="btn-submit" style={{ flex: 1, padding: "0.4rem" }}>Save Edits</button>
                          <button onClick={() => setEditingTaskId(null)} className="btn-logout" style={{ flex: 1, border: "1px solid var(--border-color)" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="task-card-header">
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", width: "80%" }}>
                            <span className="task-title" style={{ fontSize: "1.05rem" }}>{task.title}</span>
                            {task.description && (
                              <span className="task-desc" style={{ fontSize: "0.85rem", opacity: "0.8" }}>{task.description}</span>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            {/* Usability Actions: Edit & Delete */}
                            <button onClick={() => startEditing(task)} className="btn-delete-task" title="Edit Task">
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteTask(task.id)} className="btn-delete-task" title="Delete Task">
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="task-card-footer" style={{ border: "none", paddingTop: "0.5rem" }}>
                          <div className="task-meta-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>{formatTaskDate(task.createdAt)}</span>
                          </div>

                          {/* Interactive Status Badge Selector */}
                          <div className="status-dropdown-wrapper">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownTaskId(activeDropdownTaskId === task.id ? null : task.id);
                              }}
                              className={`status-badge-trigger ${
                                task.status === "Planned" 
                                  ? "planned" 
                                  : task.status === "In Progress" 
                                  ? "progress" 
                                  : "complete"
                              }`}
                              style={{ padding: "0.3rem 0.75rem", borderRadius: "6px" }}
                            >
                              {task.status}
                            </button>

                            <div className={`status-options-menu ${activeDropdownTaskId === task.id ? "show" : ""}`}>
                              {["Planned", "In Progress", "Complete"]
                                .filter((statusOption) => {
                                  if (statusOption === task.status) return false;
                                  if (task.status === "Planned" && statusOption === "Complete") return false;
                                  if (task.status === "Complete" && statusOption === "Planned") return false;
                                  return true;
                                })
                                .map((statusOption) => (
                                  <button
                                    key={statusOption}
                                    className="status-option"
                                    onClick={() => handleStatusUpdate(task.id, statusOption)}
                                  >
                                    {statusOption}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                /* Empty state placeholder */
                <div className="list-placeholder" style={{ padding: "3rem 1.5rem" }}>
                  <h3 style={{ fontSize: "1.1rem" }}>No tasks in this project</h3>
                  <p style={{ color: "var(--text-sub)", fontSize: "0.825rem", marginTop: "-0.5rem" }}>
                    {filter !== "all" 
                      ? "Try checking under a different status filter" 
                      : "Create your first task using the panel on the left!"
                    }
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Global Toast System */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={{ borderLeft: `3px solid ${t.type === 'error' ? '#ef4444' : '#111827'}` }}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
