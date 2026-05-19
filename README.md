# TaskFlow 🚀

TaskFlow is a modern and minimal **Project & Task Management Application** built using **React + Firebase** with AI-assisted development tools.  
The application helps users organize projects, manage tasks, and track progress efficiently through a clean dashboard interface.

---

# ✨ Features

## 🔐 Authentication
- Google Sign-In using Firebase Authentication
- Secure user-based task access

## 📁 Project Management
- Create multiple projects
- View all projects in sidebar
- Select project to manage its tasks separately

## ✅ Task Management
- Create tasks inside projects
- Update task status
- Edit task details
- Delete tasks
- Real-time task synchronization

## 📊 Dashboard Analytics
- Total task count
- Planned tasks count
- In Progress tasks count
- Completed tasks count

## 🔎 Search & Filter
- Instant task search
- Filter tasks by status

---

# 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| React (Vite) | Frontend |
| Firebase Authentication | Google Login |
| Firestore Database | Cloud Database |
| Vanilla CSS | Styling |
| JavaScript | Logic & State Management |

---

# 📂 Project Structure

```bash
src/
│
├── components/
│   ├── Sidebar.jsx
│   ├── UserProfile.jsx
│   ├── ProjectList.jsx
│   ├── DashboardStats.jsx
│   ├── TaskForm.jsx
│   ├── TaskList.jsx
│   └── TaskCard.jsx
│
├── firebase/
│   └── firebase.js
│
├── pages/
│   └── Dashboard.jsx
│
├── App.jsx
└── main.jsx
```

---

# 🔄 Application Flow

## Authentication Flow

```text
User Opens App
      ↓
Google Sign-In
      ↓
Firebase Authentication
      ↓
Dashboard Access
```

---

## Project & Task Flow

```text
Create Project
      ↓
Select Project
      ↓
Create Tasks
      ↓
Update Task Status
      ↓
Track Progress
```

---

# 📊 Task Workflow

```text
Planned
   ↓
In Progress
   ↓
Complete
```

---

# 🗂️ Firestore Database Structure

```text
users
 └── userId
      └── projects
           └── projectId
                └── tasks
                     └── taskId
```

---

# ⚙️ Setup Instructions

## 1️⃣ Clone Repository

```bash
git clone <your-repository-url>
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Configure Firebase

Create a `.env` file in the project root.

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 4️⃣ Enable Firebase Services

### Enable Authentication
- Firebase Console → Authentication
- Enable Google Sign-In

### Enable Firestore Database
- Create Firestore Database
- Start in Test Mode

---

## 5️⃣ Run the Application

```bash
npm run dev
```

Application URL:

```text
http://localhost:5173
```

---

# 📌 Assumptions Made

- Tasks are private to each user
- Google Authentication is sufficient
- Project-based organization improves usability
- Real-time sync is preferred over local storage

---

# ⚠️ Known Limitations

- No offline support
- Google login only
- No notifications/reminders
- Basic filtering only

---

# 🤖 AI Usage Summary

## AI Tools Used
- ChatGPT
- AI coding assistants inside IDE

## AI Assistance Included
- UI planning
- Firebase integration guidance
- React component generation
- Documentation support
- Workflow architecture discussions

## Manual Improvements
- Firebase configuration fixes
- Firestore structure optimization
- Responsive UI adjustments
- Workflow validation logic

---

# 🎯 Evaluation Focus Covered

✅ Requirement Understanding  
✅ AI Tool Usage  
✅ Application Functionality  
✅ Problem Solving  
✅ Documentation  
✅ User Experience  
✅ Deployment Readiness  

---

# 📸 Future Improvements

- Due dates
- Notifications
- Drag & Drop tasks
- Dark/Light mode
- Team collaboration

---
