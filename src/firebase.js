import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "firebase/firestore";

// Read configuration from Vite environment variables (.env file)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if config has placeholders or is missing core parameters
const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.authDomain && 
  firebaseConfig.authDomain !== "YOUR_AUTH_DOMAIN" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isConfigValid) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
  }
}

export { auth, db, googleProvider, isConfigValid };

// Core Database & Authentication Services
export const authService = {
  loginWithGoogle: async () => {
    if (!isConfigValid || !auth || !googleProvider) {
      throw new Error("Firebase is not configured correctly.");
    }
    const result = await signInWithPopup(auth, googleProvider);
    return {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };
  },

  logout: async () => {
    if (auth) {
      await signOut(auth);
    }
  }
};

export const projectService = {
  fetchProjects: async (userId) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const projectsRef = collection(db, "users", userId, "projects");
    const q = query(projectsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  createProject: async (userId, name) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const projectData = {
      name,
      createdAt: new Date().toISOString()
    };
    const projectsRef = collection(db, "users", userId, "projects");
    const docRef = await addDoc(projectsRef, projectData);
    return { id: docRef.id, ...projectData };
  },

  deleteProject: async (userId, projectId) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const projectDoc = doc(db, "users", userId, "projects", projectId);
    await deleteDoc(projectDoc);
    return true;
  }
};

export const taskService = {
  fetchTasks: async (userId) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const tasksRef = collection(db, "users", userId, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  createTask: async (userId, projectId, title, description, status) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const taskData = {
      projectId, // Links task to a project
      title,
      description: description || "",
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const tasksRef = collection(db, "users", userId, "tasks");
    const docRef = await addDoc(tasksRef, taskData);
    return { id: docRef.id, ...taskData };
  },

  updateTaskStatus: async (userId, taskId, newStatus) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const taskDoc = doc(db, "users", userId, "tasks", taskId);
    await updateDoc(taskDoc, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    return true;
  },

  updateTaskDetails: async (userId, taskId, title, description) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const taskDoc = doc(db, "users", userId, "tasks", taskId);
    await updateDoc(taskDoc, {
      title,
      description,
      updatedAt: new Date().toISOString()
    });
    return true;
  },

  deleteTask: async (userId, taskId) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const taskDoc = doc(db, "users", userId, "tasks", taskId);
    await deleteDoc(taskDoc);
    return true;
  }
};
