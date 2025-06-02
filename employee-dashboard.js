import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD6zFhOdgWY1-W0QucbgKbnsdSZ5GuHeIE",
  authDomain: "rapad-opulent-affairs.firebaseapp.com",
  projectId: "rapad-opulent-affairs",
  storageBucket: "rapad-opulent-affairs.appspot.com",
  messagingSenderId: "195096119699",
  appId: "1:195096119699:web:f4598f10231c8201dac066",
  measurementId: "G-P9J9YGH127"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Load employee data
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const { fullName, email, role } = userDoc.data();
      document.getElementById("empName").textContent = fullName;
      document.getElementById("empEmail").textContent = email;
      document.getElementById("empRole").textContent = role;
    } else {
      alert("User data not found.");
    }
  } else {
    window.location.href = "employee-portal.html";
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "employee-portal.html";
});
