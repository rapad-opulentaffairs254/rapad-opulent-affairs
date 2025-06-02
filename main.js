// main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

// Your Firebase config here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UTILS
function showMessage(elemId, message, isError = false) {
  const el = document.getElementById(elemId);
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "red" : "green";
}

// NAVIGATION & AUTH CHECK
function redirectToDashboard(user) {
  if (!user) return;
  const userId = user.uid;
  const userRef = doc(db, "users", userId);
  getDoc(userRef)
    .then((docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.isAdmin) {
          // Admin manually marked in Firestore
          window.location.href = "admin-dashboard.html";
        } else {
          window.location.href = "employee-dashboard.html";
        }
      } else {
        // If user doc missing, consider default employee
        window.location.href = "employee-dashboard.html";
      }
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
      window.location.href = "employee-dashboard.html";
    });
}

// AUTH STATE CHANGE HANDLER
onAuthStateChanged(auth, (user) => {
  if (user) {
    // If on login page, redirect
    if (window.location.pathname.includes("employee-portal.html")) {
      redirectToDashboard(user);
    }
    // For dashboard pages, load data accordingly
    else if (window.location.pathname.includes("employee-dashboard.html")) {
      loadEmployeeDashboard(user);
    } else if (window.location.pathname.includes("admin-dashboard.html")) {
      loadAdminDashboard(user);
    }
  }
});

// LOGIN FORM
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    signInWithEmailAndPassword(auth, email, password)
      .then((cred) => {
        loginForm.reset();
      })
      .catch((err) => {
        alert("Login failed: " + err.message);
      });
  });
}

// REGISTER FORM
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = registerForm.email.value.trim();
    const password = registerForm.password.value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create user document with default isAdmin: false
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

// LOGOUT BUTTON
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "employee-portal.html";
    });
  });
}

// TAB SWITCHING
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ------------------
// Employee Dashboard Logic
// ------------------

async function loadEmployeeDashboard(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    // Fill profile form
    const displayNameInput = document.getElementById("displayName");
    const phoneInput = document.getElementById("phoneNumber");
    if (displayNameInput) displayNameInput.value = data.displayName || "";
    if (phoneInput) phoneInput.value = data.phoneNumber || "";

    // Load user tasks
    loadEmployeeTasks(user.uid);
  }
}

// Update Profile Submit
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
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        phoneNumber,
      });
      showMessage("profileMsg", "Profile updated successfully!");
    } catch (error) {
      showMessage("profileMsg", "Error updating profile: " + error.message, true);
    }
  });
}

// Submit Report
const reportForm = document.getElementById("reportForm");
if (reportForm) {
  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const reportText = reportForm.reportText.value.trim();
    if (!reportText) {
      showMessage("reportMsg", "Report cannot be empty.", true);
      return;
    }
    try {
      await addDoc(collection(db, "reports"), {
        userId: user.uid,
        reportText,
        timestamp: new Date(),
      });
      reportForm.reset();
      showMessage("reportMsg", "Report submitted successfully!");
    } catch (error) {
      showMessage("reportMsg", "Error submitting report: " + error.message, true);
    }
  });
}

// Load Employee Tasks
async function loadEmployeeTasks(userId) {
  const tasksList = document.getElementById("tasksList");
  if (!tasksList) return;

  // Get tasks from Firestore collection "tasks" where userId matches
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
      div.textContent = task.details + (task.schedule ? " (Schedule: " + task.schedule + ")" : "");
      tasksList.appendChild(div);
    });
  } catch (error) {
    tasksList.textContent = "Failed to load tasks.";
  }
}

// ------------------
// Admin Dashboard Logic
// ------------------

async function loadAdminDashboard(user) {
  // Load employees list
  loadEmployeesList();

  // Populate employee selects
  populateEmployeeSelect("employeeSelectSchedule");
  populateEmployeeSelect("employeeSelectLeave");
  populateEmployeeSelect("employeeSelectDuty");
}

// Load all employees (non-admin)
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

// Populate employee select dropdowns
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

// Assign Schedule Form Submit
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

// Leave Form Submit
const leaveForm = document.getElementById("leaveForm");
if (leaveForm) {
  leaveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = leaveForm.employeeSelectLeave.value;
    const leaveDetails = leaveForm.leaveDetails.value.trim();
    if (!userId || !leaveDetails) return;

    try {
      await addDoc(collection(db, "leaves"), {
        userId,
        details: leaveDetails,
        timestamp: new Date(),
      });
      leaveForm.reset();
      showMessage("leaveMsg", "Leave/off submitted successfully!");
    } catch (error) {
      showMessage("leaveMsg", "Failed to submit leave/off: " + error.message, true);
    }
  });
}

// Duty Form Submit
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
        details: dutyDetails,
        timestamp: new Date(),
      });
      dutyForm.reset();
      showMessage("dutyMsg", "Duty assigned successfully!");
    } catch (error) {
      showMessage("dutyMsg", "Failed to assign duty: " + error.message, true);
    }
  });
}
