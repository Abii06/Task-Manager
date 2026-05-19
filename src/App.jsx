import React, { useState, useEffect, useMemo } from "react";
import { auth, isConfigValid, authService, taskService } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  // --- React State Hooks ---
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState([]);
  
  // Status dropdown tracker (TaskId or null)
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState(null);

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  
  // Task Creator Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Planned");

  // --- Toast Manager Helpers ---
  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // --- Firebase Auth & Task Listeners ---
  useEffect(() => {
    if (!isConfigValid) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
        
        try {
          const list = await taskService.fetchTasks(firebaseUser.uid);
          setTasks(list);
        } catch (e) {
          showToast("Failed to load tasks from Firestore.", "error");
        }
      } else {
        setUser(null);
        setTasks([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Click outside listener to close task status dropdowns ---
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeDropdownTaskId && !e.target.closest(".status-dropdown-wrapper")) {
        setActiveDropdownTaskId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [activeDropdownTaskId]);

  // --- Operations / Event Handlers ---

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const loggedUser = await authService.loginWithGoogle();
      showToast(`Welcome, ${loggedUser.displayName}!`, "success");
    } catch (err) {
      showToast("Sign-in process failed. Please check your console.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      showToast("Signed out successfully.", "success");
    } catch (err) {
      showToast("Failed to sign out.", "error");
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Task title cannot be blank.", "error");
      return;
    }

    try {
      const newTask = await taskService.createTask(user.uid, title.trim(), description.trim(), status);
      setTasks((prev) => [newTask, ...prev]);
      setTitle("");
      setDescription("");
      setStatus("Planned");
      showToast("Task created successfully!", "success");
    } catch (err) {
      showToast("Error adding task. Verify Firestore permissions.", "error");
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
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => filter === "all" || t.status === filter)
      .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tasks, filter, searchQuery]);

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

  // Loader screen
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", flexDirection: "column", gap: "1rem" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.05)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Initializing connection...</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { to { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  // ==========================================================================
  // VIEW: Setup Required (Missing or Placeholder Firebase Credentials)
  // ==========================================================================
  if (!isConfigValid) {
    return (
      <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "90vh" }}>
        <div className="auth-card" style={{ maxWidth: "600px", textAlign: "left", padding: "2.5rem" }}>
          <div className="logo-section" style={{ alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <h1 style={{ marginTop: "0.5rem" }}>Setup Required</h1>
            <p>TaskFlow requires active Firebase credentials to run.</p>
          </div>
          
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p>
              Please initialize your environment configurations. Create a <code>.env</code> file in the <strong>root folder</strong> of your project and insert your Google Firebase web app keys:
            </p>

            <pre style={{
              background: "rgba(0,0,0,0.3)",
              padding: "1rem",
              borderRadius: "var(--radius-sm)",
              fontFamily: "monospace",
              border: "1px solid var(--border-color)",
              color: "#a5b4fc",
              overflowX: "auto",
              userSelect: "all"
            }}>
{`VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}
            </pre>

            <p style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>
              Once you create the file, restart your Vite development server (e.g. run <code>npm run dev</code> or refresh the browser) to initialize the secure multi-user task environment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: "680px" }}>
      {/* ==========================================================================
         VIEW: Authentication Page (Logged Out)
         ========================================================================== */}
      {!user ? (
        <div className="screen active auth-screen-layout">
          <div className="auth-card">
            <div className="logo-section">
              <div className="logo-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M7.5 11.5L10 14l6.5-6.5"/>
                </svg>
              </div>
              <h1>TaskFlow</h1>
              <p>Organize your tasks elegantly and efficiently.</p>
            </div>

            <div className="auth-buttons">
              <button onClick={handleGoogleLogin} className="btn-google">
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "4px" }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ==========================================================================
           VIEW: Simple Task Dashboard (Logged In)
           ========================================================================== */
        <div className="screen active" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          
          {/* Dashboard Header */}
          <header className="dash-header">
            <div className="dash-title-area">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="M7.5 11.5L10 14l6.5-6.5"/>
              </svg>
              <h2>TaskFlow</h2>
              <span className="app-badge production">Firebase Connected</span>
            </div>

            {/* Profile Widget */}
            <div className="user-profile-widget">
              <img className="user-avatar" src={user.photoURL || "https://api.dicebear.com/7.x/adventurer/svg?seed=Alex"} alt="Profile" />
              <div className="user-info">
                <span className="user-name">{user.displayName}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <button onClick={handleLogout} className="btn-logout" title="Log Out">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </header>

          {/* Create Task Form Widget */}
          <section className="panel-creator" style={{ position: "relative", top: "0" }}>
            <h3 className="panel-title" style={{ fontSize: "1.1rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create New Task
            </h3>
            
            <form onSubmit={handleAddTask} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: "1rem" }}>
                <div className="form-group" style={{ margin: "0" }}>
                  <label htmlFor="task-title-input">Task Title *</label>
                  <input 
                    type="text" 
                    id="task-title-input" 
                    className="form-input" 
                    placeholder="Enter task title..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required 
                    maxLength={80}
                  />
                </div>

                <div className="form-group" style={{ margin: "0" }}>
                  <label htmlFor="task-status-input">Status</label>
                  <select 
                    id="task-status-input" 
                    className="form-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: "0" }}>
                <label htmlFor="task-desc-input">Description (Optional)</label>
                <textarea 
                  id="task-desc-input" 
                  className="form-input" 
                  rows={2} 
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
          </section>

          {/* Task Listing Panel */}
          <main className="panel-viewer">
            <div className="controls-bar" style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "stretch" }}>
              {/* Search Bar */}
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: "20px", padding: "0.5rem 1.25rem", background: "transparent" }}
              />

              {/* Filter Pills */}
              <div className="filters-wrapper" style={{ justifyContent: "center", width: "100%" }}>
                {["all", "Planned", "In Progress", "Complete"].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                    style={{ flex: "1", textAlign: "center" }}
                  >
                    {f === "all" ? "All Tasks" : f}
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
                              // Hide the task's current status from the dropdown options list
                              if (statusOption === task.status) return false;
                              
                              // Rule 1: From Planned, you can only move to In Progress (Complete is blocked)
                              if (task.status === "Planned" && statusOption === "Complete") return false;
                              
                              // Rule 2: From Complete, you can only move to In Progress (Planned is blocked)
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
                  <h3 style={{ fontSize: "1.1rem" }}>No tasks in this category</h3>
                  <p style={{ color: "var(--text-sub)", fontSize: "0.825rem", marginTop: "-0.5rem" }}>
                    {filter !== "all" 
                      ? "Try checking under a different status filter" 
                      : "Create your first task using the panel above!"
                    }
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Dynamic Toast Alert stack */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
