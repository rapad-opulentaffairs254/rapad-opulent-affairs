// Import Firebase modules from CDN (v10.12.0 latest stable)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, addDoc, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDRBIRbx2xbRY2jajO6UH8Acb0uAupEz9c",
  authDomain: "my-employee-management-21ba6.firebaseapp.com",
  projectId: "my-employee-management-21ba6",
  storageBucket: "my-employee-management-21ba6.firebasestorage.app",
  messagingSenderId: "560510598422",
  appId: "1:560510598422:web:08504419aac8d9ff976437",
  measurementId: "G-X3WWWP1DZ7"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Utility to show messages
function showMessage(elemId, message, isError = false) {
  const el = document.getElementById(elemId);
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "red" : "green";
}

// Redirect based on user role
async function redirectToDashboard(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.isAdmin) {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "employee-dashboard.html";
    }
  } else {
    window.location.href = "employee-dashboard.html";
  }
}

// Monitor Auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    const path = window.location.pathname;
    if (path.includes("index.html") || path === "/") {
      redirectToDashboard(user);
    } else if (path.includes("employee-portal.html")) {
      redirectToDashboard(user);
    } else if (path.includes("employee-dashboard.html")) {
      loadEmployeeDashboard(user);
    } else if (path.includes("admin-dashboard.html")) {
      loadAdminDashboard(user);
    }
  }
});

// ---------- LOGIN FORM ----------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      loginForm.reset();
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  });
}

// ---------- REGISTER FORM ----------
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = registerForm.email.value.trim();
    const password = registerForm.password.value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create user doc with default values
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        isAdmin: false,
        displayName: "",
        phoneNumber: "",
      });
      registerForm.reset();
      alert("Registration successful! Please login.");
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  });
}

// ---------- LOGOUT BUTTON ----------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });
}

// ---------- EMPLOYEE DASHBOARD ----------
async function loadEmployeeDashboard(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();

  const displayNameInput = document.getElementById("displayName");
  const phoneInput = document.getElementById("phoneNumber");
  if (displayNameInput) displayNameInput.value = data.displayName || "";
  if (phoneInput) phoneInput.value = data.phoneNumber || "";

  loadEmployeeTasks(user.uid);
}

// Update profile form
const profileForm = document.getElementById("profileForm");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const displayName = profileForm.displayName.value.trim();
    const phoneNumber = profileForm.phoneNumber.value.trim();

    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, "users", user.uid), { displayName, phoneNumber });
      showMessage("profileMsg", "Profile updated successfully!");
    } catch (error) {
      showMessage("profileMsg", "Error updating profile: " + error.message, true);
    }
  });
}

// Load employee tasks
async function loadEmployeeTasks(userId) {
  const tasksList = document.getElementById("tasksList");
  if (!tasksList) return;

  try {
    const q = query(collection(db, "tasks"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      tasksList.textContent = "No tasks assigned yet.";
      return;
    }
    tasksList.innerHTML = "";
    querySnapshot.forEach((doc) => {
      const task = doc.data();
      const div = document.createElement("div");
      div.className = "task-item";
      div.textContent = task.details + (task.schedule ? ` (Schedule: ${task.schedule})` : "");
      tasksList.appendChild(div);
    });
  } catch (error) {
    tasksList.textContent = "Failed to load tasks.";
  }
}

// ---------- ADMIN DASHBOARD ----------
async function loadAdminDashboard() {
  await loadEmployeesList();
  populateEmployeeSelect("employeeSelectSchedule");
  populateEmployeeSelect("employeeSelectLeave");
  populateEmployeeSelect("employeeSelectDuty");
}

async function loadEmployeesList() {
  const employeesList = document.getElementById("employeesList");
  if (!employeesList) return;

  try {
    const q = query(collection(db, "users"), where("isAdmin", "==", false));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      employeesList.textContent = "No employees found.";
      return;
    }
    employeesList.innerHTML = "<ul>" + querySnapshot.docs.map(doc => {
      const data = doc.data();
      return `<li>${data.displayName || data.email} (${doc.id})</li>`;
    }).join("") + "</ul>";
  } catch (error) {
    employeesList.textContent = "Error loading employees.";
  }
}

async function populateEmployeeSelect(selectId) {
  const selectElem = document.getElementById(selectId);
  if (!selectElem) return;

  selectElem.innerHTML = '<option value="" disabled selected>Select employee</option>';

  try {
    const q = query(collection(db, "users"), where("isAdmin", "==", false));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = data.displayName || data.email;
      selectElem.appendChild(option);
    });
  } catch (error) {
    selectElem.innerHTML = '<option disabled>Error loading employees</option>';
  }
}

// Schedule form
const scheduleForm = document.getElementById("scheduleForm");
if (scheduleForm) {
  scheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = scheduleForm.employeeSelectSchedule.value;
    const scheduleDetails = scheduleForm.scheduleDetails.value.trim();
    if (!userId || !scheduleDetails) return;

    try {
      await addDoc(collection(db, "tasks"), {
        userId,
        details: scheduleDetails,
        timestamp: new Date(),
        schedule: scheduleDetails,
      });
      scheduleForm.reset();
      showMessage("scheduleMsg", "Schedule assigned successfully!");
    } catch (error) {
      showMessage("scheduleMsg", "Failed to assign schedule: " + error.message, true);
    }
  });
}

// Leave form
const leaveForm = document.getElementById("leaveForm");
if (leaveForm) {
  leaveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = leaveForm.employeeSelectLeave.value;
    const leaveReason = leaveForm.leaveReason.value.trim();
    if (!userId || !leaveReason) return;

    try {
      await addDoc(collection(db, "leaveRequests"), {
        userId,
        leaveReason,
        status: "pending",
        timestamp: new Date(),
      });
      leaveForm.reset();
      showMessage("leaveMsg", "Leave request submitted!");
    } catch (error) {
      showMessage("leaveMsg", "Failed to submit leave request: " + error.message, true);
    }
  });
}

// Duty form
const dutyForm = document.getElementById("dutyForm");
if (dutyForm) {
  dutyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = dutyForm.employeeSelectDuty.value;
    const dutyDetails = dutyForm.dutyDetails.value.trim();
    if (!userId || !dutyDetails) return;

    try {
      await addDoc(collection(db, "duties"), {
        userId,
        dutyDetails,
        timestamp: new Date(),
      });
      dutyForm.reset();
      showMessage("dutyMsg", "Duty assigned successfully!");
    } catch (error) {
      showMessage("dutyMsg", "Failed to assign duty: " + error.message, true);
    }
  });
}
