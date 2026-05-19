# TaskFlow — Professional Task Manager

TaskFlow is a production-grade, single-column task management application built to fulfill the core requirements of a modern workflow. It is built using **React (Vite)**, styled with **Vanilla CSS (Monochrome Minimalist)**, and powered by **Google Firebase (Auth & Firestore)**.

---

## 1. How to Access and Use the Application
TaskFlow provides a streamlined, single-screen dashboard. Once logged in, you can:
- **Create Tasks:** Use the top panel to enter a title (required), an optional description, and select the initial status.
- **View & Filter:** View your tasks dynamically sorted with the newest at the top. Click the "Planned", "In Progress", or "Complete" pills to instantly filter your view.
- **Fast Search:** Type in the search bar to instantly filter tasks by title or description (this processes in-memory for maximum speed).
- **Update Status:** Click the custom status badge on any task card to reveal a dropdown menu. Select the new status to update it instantly.
- **Inline Editing:** Click the **Edit (Pencil)** icon on any task to modify its title or description without leaving the page.
- **Delete Tasks:** Click the **Delete (Trash)** icon to remove a task. You will be prompted to confirm the deletion.

## 2. Login Instructions
1. When you launch the app, you will be greeted by the Authentication Screen.
2. Click the **"Sign in with Google"** button.
3. A secure Google OAuth popup will appear. Select your preferred Google account.
4. Upon successful authentication, you will be redirected to your private, personalized task dashboard.

## 3. Important Assumptions Made
To demonstrate practical engineering judgment, several ambiguities in the requirements were resolved:

| Requirement/Ambiguity | Decision / Assumption | Technical Justification |
| :--- | :--- | :--- |
| **OAuth Specifics** | Used **Firebase Auth** via Google Client SDK. | Provides quick, native, multi-device secure authentication. |
| **Task Status Transitions** | Implemented a **Strict State-Machine**: <br>• Planned $\rightarrow$ In Progress<br>• In Progress $\leftrightarrow$ Planned/Complete<br>• Complete $\rightarrow$ In Progress | Prevents users from accidentally regressing completed work entirely back to an unstarted "Planned" state, enforcing clean workflow pipelines. |
| **Data Scope & Privacy** | Private document namespaces inside Firestore (`users/{userId}/tasks/`). | Assumed tasks are private. The database guarantees users cannot fetch or access other users' data. |
| **Missing CRUD Features** | Added **Delete** and **Inline Editing**. | A task manager without the ability to delete mistakes or fix typos is a frustrating user experience. These were added to ensure completeness without massive scope bloat. |
| **Database Cost Optimization** | Handled Search and Filter via React `useMemo`. | Rather than querying the database for every keystroke or tab switch, the app fetches data once and filters it in-memory to save on cloud reads. |

## 4. Known Limitations
- **Google Auth Dependency:** Login is strictly bounded to a Google Identity; there is no standard email/password signup.
- **No Offline Support:** The application requires an active internet connection to synchronize data with Firebase. 
- **Basic Indexing:** The application relies on standard Firestore indexes. Adding complex multi-field compound filters (e.g., filtering by Date *and* Status simultaneously) would require setting up custom indices in the Firebase Console.

## 5. Important Notes or Warnings for Users
- **Data Deletion is Permanent:** Because this application uses real-time Firestore sync, clicking "OK" on a task deletion prompt permanently removes the document from the database. It cannot be recovered.
- **Blocked State Transitions:** You will notice that if a task is marked as "Complete", the "Planned" status option vanishes from the dropdown menu. This is a deliberate workflow guard, not a bug!

## 6. Setup Instructions

To run and evaluate TaskFlow locally:

### Extract & Install Dependencies
Open your shell in the project directory and run:
```powershell
npm install
```

### Configure Firebase Environment
Create a file named `.env` in the **root folder** of the project and paste your Firebase Web App credentials (you can refer to the included `.env.example` file):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
*(Note: Ensure your Firebase Google Sign-In provider is enabled inside the Authentication console).*

### Launch Development Server
```powershell
npm run dev
```
Open **`http://localhost:5173/`** in your browser. If your `.env` variables are missing, the UI will safely intercept the render and display a configuration guide.

---

## 7. AI Usage Summary

### Which AI tools you used
I used an Advanced Agentic Coding AI Assistant (powered by the Gemini 3.1 Pro High model architecture) acting as a pair-programmer within my IDE.

### How you used them
The AI was used to accelerate boilerplate generation, refine CSS styling for a professional aesthetic, and brainstorm architectural decisions. The development process was conversational:
1. **Architectural Ideation:** Discussed the trade-offs of using local storage vs. a real database, ultimately guiding the AI to implement strict Firebase environment configurations.
2. **Component Generation:** Instructed the AI to write the foundational React components (`App.jsx`) and the Firebase wrapper (`firebase.js`).
3. **Styling:** Asked the AI to generate a clean, monochrome Vanilla CSS design to ensure the UI looked professional without relying on heavy external frameworks.

### Example prompts
- *"Make the UI simple and professional. Do not add colors and remove the emojis to ensure an enterprise aesthetic."*
- *"Users should only see their own tasks. Implement a security model that silos the data."*
- *"If the task crosses the planned phase, it should not be able to come back to that place. Implement a strict state-transition matrix."*

### What AI-generated code you modified or corrected manually
While the AI successfully scaffolded the primary components, several manual interventions and architectural corrections were required:
- **Environment Variable Guards:** The AI initially attempted to mock data or hardcode setups. I manually intervened to enforce the use of Vite `import.meta.env` guards to prevent keys from leaking into the repository.
- **Firestore Logic Adjustments:** I audited and corrected the Firebase initialization logic to ensure it didn't throw errors when hot-reloading the Vite server (`getApps().length === 0` checks).
- **DOM & CSS Cleanup:** I manually reviewed the CSS layouts to ensure responsive behaviors worked flawlessly on mobile resolutions and adjusted component mappings to support the inline-edit state handlers cleanly.
