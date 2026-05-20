// Firebase Imports
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  doc,
  where,
  orderBy,
  getDocs,
  writeBatch,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmXewXcQQt97EJzbKceLbCoTTG_9aJlJI",
  authDomain: "bhaskarjyoticlub.firebaseapp.com",
  databaseURL: "https://bhaskarjyoticlub-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bhaskarjyoticlub",
  storageBucket: "bhaskarjyoticlub.firebasestorage.app",
  messagingSenderId: "730168687443",
  appId: "1:730168687443:web:479bedc258bd9dd06fffa6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Single User Configuration
const APP_EMAIL = "bhaskarjyoticlub@gmail.com";

// --- Global State ---
let currentUser = null, activeProjectId = null, projects = [], projectsUnsubscribe = null, expensesUnsubscribe = null, allExpensesForProject = [];
let showAllExpenses = false; // Added state for View All feature

// --- DOM Elements ---
const views = {
  splash: document.getElementById('splash-view'),
  auth: document.getElementById('auth-view'),
  app: document.getElementById('app-view')
};
const userNameDisplay = document.getElementById('user-display-name');
const authTitle = document.getElementById('auth-title');
const emailForm = document.getElementById('email-form');
const passwordInput = document.getElementById('password-input');
const emailActionBtn = document.getElementById('email-action-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const eyeIcon = document.getElementById('eye-icon');
const eyeSlashIcon = document.getElementById('eye-slash-icon');
const forgotPasswordLink = document.getElementById('forgot-password-link');

const expenseDashboard = document.getElementById('expense-dashboard'), noProjectMessage = document.getElementById('no-project-message'), expenseForm = document.getElementById('expense-form'), expenseList = document.getElementById('expense-list'), finalExpensesEl = document.getElementById('final-expenses');
const userProfileDesktop = document.getElementById('user-profile-desktop'), userProfileMobile = document.getElementById('user-profile-mobile');
const hamburgerBtn = document.getElementById('user-profile-desktop'), mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop'), mobileMenu = document.getElementById('mobile-menu'), closeMenuBtn = document.getElementById('close-menu-btn'), mobileSignOutBtn = document.getElementById('mobile-sign-out-btn');
const editModal = document.getElementById('edit-modal'), editExpenseForm = document.getElementById('edit-expense-form'), cancelEditBtn = document.getElementById('cancel-edit-btn');
const searchInput = document.getElementById('search-input'), startDateInput = document.getElementById('start-date-input'), endDateInput = document.getElementById('end-date-input');
const sidebarProjectList = document.getElementById('sidebar-project-list'), sidebarAddProjectBtn = document.getElementById('sidebar-add-project-btn');
const editProjectModal = document.getElementById('edit-project-modal'), editProjectForm = document.getElementById('edit-project-form'), cancelEditProjectBtn = document.getElementById('cancel-edit-project-btn');
const addProjectModal = document.getElementById('add-project-modal'), addProjectFormModal = document.getElementById('add-project-form-modal'), cancelAddProjectBtn = document.getElementById('cancel-add-project-btn');
const infoModal = document.getElementById('info-modal'), infoModalTitle = document.getElementById('info-modal-title'), infoModalContent = document.getElementById('info-modal-content'), closeInfoModalBtn = document.getElementById('close-info-modal-btn');
const projectSummaryTitle = document.getElementById('project-summary-title');
const viewAllBtn = document.getElementById('view-all');
const paymentStatus = document.getElementById('payment-status');
const totalPaidEl = document.getElementById('total-paid');
const totalUnpaidEl = document.getElementById('total-unpaid');

const address = document.getElementById('address');
const additionalInfo = document.getElementById('additional-info');
const editPaymentStatus = document.getElementById('edit-payment-status');
const editAddress = document.getElementById('edit-address');
const editAdditionalInfo = document.getElementById('edit-additional-info');

// --- Custom Native-Feel Toast Notification ---
function showToast(message, type = 'error') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col items-center gap-3 w-max pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  let icon = '';
  if (type === 'error') {
    icon = `<svg class="w-5 h-5 text-red-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else if (type === 'success') {
    icon = `<svg class="w-5 h-5 text-green-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.className = `bg-slate-800 text-white px-5 py-3 rounded-full shadow-2xl flex items-center text-sm font-medium transition-all duration-300 translate-y-10 opacity-0 pointer-events-auto border border-slate-700/50`;
  toast.innerHTML = `${icon}<span>${escapeHTML(message)}</span>`;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-10', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-10', 'opacity-0');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

// --- Custom Native-Feel Confirmation Modal ---
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-transparent backdrop-blur-sm z-[100] flex items-end justify-center opacity-0 transition-opacity duration-300';

    const modal = document.createElement('div');
    modal.className = 'bg-white p-6 pb-12 border-t-2 border-red-200 s rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] w-full md:max-w-md text-left transform translate-y-full transition-transform duration-300';

    modal.innerHTML = `
    <div class="flex justify-between items-center mb-4">
    <h3 class="text-xl font-bold text-slate-800 pr-4">${escapeHTML(title)}</h3>
    <div class="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </div>
    </div>

    <p class="text-sm text-slate-500 mb-8 leading-relaxed">${escapeHTML(message)}</p>

    <div class="flex gap-3">
    <button id="confirm-cancel-btn" class="flex-1 px-4 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
    <button id="confirm-delete-btn" class="flex-1 px-4 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Delete</button>
    </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('overflow-hidden');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        modal.classList.remove('translate-y-full');
      });
    });

    const closeAndResolve = (result) => {
      overlay.classList.add('opacity-0');
      modal.classList.add('translate-y-full');
      document.body.classList.remove('overflow-hidden');

      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 300);
    };

    modal.querySelector('#confirm-cancel-btn').addEventListener('click', () => closeAndResolve(false));
    modal.querySelector('#confirm-delete-btn').addEventListener('click', () => closeAndResolve(true));
  });
}

// --- View Management ---
const showView = (viewName) => {
  Object.values(views).forEach(v => v?.classList.remove('active'));
  if (views[viewName]) views[viewName].classList.add('active');
};

showView('splash');

// --- Authentication ---
let isInitialLoad = true;

onAuthStateChanged(auth, user => {
  currentUser = user;

  const routeUser = () => {
    if (user) {
      showView('app');
      setupUIForUser(user);
      listenForProjects(user.uid);
    } else {
      showView('auth');
      if (projectsUnsubscribe) projectsUnsubscribe();
      if (expensesUnsubscribe) expensesUnsubscribe();
      activeProjectId = null;
    }
  };

  if (isInitialLoad) {
    isInitialLoad = false;
    setTimeout(routeUser, 1000);
  } else {
    routeUser();
  }
});

function setInputStatus(status) {
  if (!passwordInput) return;

  passwordInput.classList.remove('border-red-500', 'ring-1', 'ring-red-500', 'border-green-500', 'ring-green-500', 'focus:ring-indigo-500', 'border-slate-200', 'focus:border-indigo-500');

  if (status === 'error') {
    passwordInput.classList.add('border-red-500', 'ring-1', 'ring-red-500');
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } else if (status === 'success') {
    passwordInput.classList.add('border-green-500', 'ring-1', 'ring-green-500');
  } else {
    passwordInput.classList.add('border-slate-200', 'focus:ring-indigo-500', 'focus:border-indigo-500');
  }
}

function setAuthButtonLoading(isLoading) {
  if (!emailActionBtn || !btnText || !btnSpinner) return;

  if (isLoading) {
    btnText.classList.add('opacity-0');
    btnSpinner.classList.remove('opacity-0');
    emailActionBtn.disabled = true;
  } else {
    btnText.classList.remove('opacity-0');
    btnSpinner.classList.add('opacity-0');
    emailActionBtn.disabled = false;
  }
}

passwordInput?.addEventListener('input', () => {
  setInputStatus('default');
});

togglePasswordBtn?.addEventListener('click', () => {
  if (!passwordInput || !eyeIcon || !eyeSlashIcon) return;

  const isPassword = passwordInput.getAttribute('type') === 'password';
  passwordInput.setAttribute('type', isPassword ? 'text': 'password');

  if (isPassword) {
    eyeIcon.classList.add('hidden');
    eyeSlashIcon.classList.remove('hidden');
  } else {
    eyeIcon.classList.remove('hidden');
    eyeSlashIcon.classList.add('hidden');
  }
});

emailForm?.addEventListener('submit', async e => {
  e.preventDefault();

  if (!navigator.onLine) {
    showToast("Please connect to the internet", "error");
    return;
  }

  const password = passwordInput.value;

  if (!password) {
    showToast('Please enter a password.', 'error');
    setInputStatus('error');
    return;
  }

  setAuthButtonLoading(true);

  try {
    await signInWithEmailAndPassword(auth, APP_EMAIL, password);
    setInputStatus('success');
    showToast("Login successful!", "success");
    setAuthButtonLoading(false);
  } catch (loginError) {
    setInputStatus('error');
    setAuthButtonLoading(false);

    let friendlyMessage = "Something went wrong. Please try again.";
    const errCode = loginError.code;

    switch (errCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        friendlyMessage = "Incorrect password.";
        break;
      case 'auth/network-request-failed':
        friendlyMessage = "Network error. Please check your connection.";
        break;
      case 'auth/too-many-requests':
        friendlyMessage = "Too many failed attempts. Try again later.";
        break;
    }
    showToast(friendlyMessage, 'error');
  }
});

forgotPasswordLink?.addEventListener('click', async e => {
  e.preventDefault();
  try {
    await sendPasswordResetEmail(auth, APP_EMAIL);
    showToast('Password reset email sent to admin!', 'success');
  } catch (error) {
    showToast("Failed to send reset email.", 'error');
  }
});

// --- UI Setup & Mobile Menu ---
function setupUIForUser(user) {
  const photo = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent('Admin')}&background=E2E8F0&color=4A5568`;

  if (userProfileDesktop) userProfileDesktop.innerHTML = `<div class="w-10 h-10 rounded-full overflow-hidden"><img src="${photo}" alt="User photo" class="w-full h-full object-cover"></div>`;
  if (userProfileMobile) userProfileMobile.innerHTML = `<div class="flex items-center"><div class="w-12 h-12 rounded-full overflow-hidden mr-3"><img src="${photo}" alt="User photo" class="w-full h-full object-cover"></div><div><p class="font-semibold">Admin Account</p><p class="text-xs text-gray-500 truncate">${escapeHTML(user.email)}</p></div></div>`;

  if (navigator.onLine) {
    updateStatusUI('welcome');
  } else {
    updateStatusUI('offline');
  }

  const dateInput = document.getElementById('date');
  if (dateInput) dateInput.valueAsDate = new Date();
}

const openMenu = () => {
  mobileMenuBackdrop?.classList.remove('pointer-events-none', 'opacity-0');
  mobileMenu?.classList.remove('-translate-x-full');
  document.body.classList.add('overflow-hidden');
};
const closeMenu = () => {
  mobileMenuBackdrop?.classList.add('pointer-events-none', 'opacity-0');
  mobileMenu?.classList.add('-translate-x-full');
  document.body.classList.remove('overflow-hidden'); 
};
hamburgerBtn?.addEventListener('click', openMenu);
closeMenuBtn?.addEventListener('click', closeMenu);
mobileMenuBackdrop?.addEventListener('click', e => {
  if (e.target === mobileMenuBackdrop) closeMenu();
});
mobileSignOutBtn?.addEventListener('click', () => signOut(auth));

// --- Projects ---
function listenForProjects(uid) {
  const appId = "construction-expenses";
  const projectsRef = collection(db,
    `artifacts/${appId}/users/${uid}/projects`);

  projectsUnsubscribe = onSnapshot(query(projectsRef, orderBy("name")),
    async (snapshot) => {
      if (snapshot.metadata.fromCache) return;

      projects = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
    }));

    if (projects.length === 0 && navigator.onLine) {
      const newProjectRef = doc(collection(db, `artifacts/${appId}/users/${uid}/projects`));
      await runTransaction(db, async (t) => {
        t.set(newProjectRef, {
          name: "General"
        });
      });
      return;
    }
    populateSidebarProjects(projects);

    const savedProjectId = localStorage.getItem('lastActiveProjectId');

    if (savedProjectId && projects.find(p => p.id === savedProjectId)) {
      activeProjectId = savedProjectId;
    } else if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
      activeProjectId = projects[0]?.id;
    }

    if (activeProjectId) {
      localStorage.setItem('lastActiveProjectId', activeProjectId);
      updateActiveProject();
    }
  });
}

function updateActiveProject() {
const activeProject = projects.find(p => p.id === activeProjectId);
if (activeProject && projectSummaryTitle) projectSummaryTitle.textContent = `${activeProject.name}`;
updateSidebarSelection();
toggleDashboardVisibility(true);
listenForExpenses(currentUser.uid, activeProjectId);
}

sidebarAddProjectBtn?.addEventListener('click', (e) => {
e.preventDefault();
addProjectModal.classList.remove('hidden');
document.body.classList.add('overflow-hidden');
setTimeout(() => {
document.getElementById('new-project-name-modal');
}, 100);
});


addProjectFormModal?.addEventListener('submit', async e => {
e.preventDefault();
if (!navigator.onLine) {
showToast("Please connect to internet", "error");
return;
}
const projectName = document.getElementById('new-project-name-modal').value.trim();
if (projectName && currentUser) {
const appId = "construction-expenses";
const newProjRef = doc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/projects`));
try {
await runTransaction(db, async (t) => {
t.set(newProjRef, {
name: projectName
});
});
addProjectFormModal.reset();
addProjectModal.classList.add('hidden');
document.body.classList.remove('overflow-hidden'); 

showToast(`Project "${projectName}" created!`, "success");

} catch (err) {
showToast("Transaction failed: Check your connection.", "error");
}
}
});


function populateSidebarProjects(projects) {
if (!sidebarProjectList) return;
sidebarProjectList.innerHTML = projects.map(p => {
const isGeneral = p.name === "General";
const buttonsHTML = isGeneral ? '': `<div class="flex items-center space-x-2 opacity-50 group-hover:opacity-100 transition-opacity"><button data-project-id="${p.id}" data-project-name="${escapeHTML(p.name)}" class="edit-project-btn p-1 text-gray-400 hover:text-indigo-600"><svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z"></path></svg></button><button data-project-id="${p.id}" data-project-name="${escapeHTML(p.name)}" class="delete-project-btn p-1 text-gray-400 hover:text-red-600"><svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>`;
return `<div class="flex justify-between items-center group rounded"><a href="#" data-project-id="${p.id}" class="sidebar-project-link block py-2 px-4 text-sm flex-grow truncate rounded">${escapeHTML(p.name)}</a>${buttonsHTML}</div>`;
}).join('');

document.querySelectorAll('.sidebar-project-link').forEach(link => link.addEventListener('click', e => {
e.preventDefault();
activeProjectId = e.target.dataset.projectId;

localStorage.setItem('lastActiveProjectId', activeProjectId);

showAllExpenses = false;
if (viewAllBtn) viewAllBtn.style.display = 'block';

updateActiveProject();
closeMenu();
}));
document.querySelectorAll('.edit-project-btn').forEach(btn => btn.addEventListener('click',
handleEditProject));
document.querySelectorAll('.delete-project-btn').forEach(btn => btn.addEventListener('click',
handleDeleteProject));
}

function updateSidebarSelection() {
document.querySelectorAll('.sidebar-project-link').forEach(link => {
link.classList.toggle('active',
link.dataset.projectId === activeProjectId);
});
}

const toggleDashboardVisibility = (hasProjects) => {
if (expenseDashboard) expenseDashboard.style.display = hasProjects ? 'block': 'none';
if (noProjectMessage) noProjectMessage.style.display = hasProjects ? 'none': 'block';
};

// --- View All Logic ---
viewAllBtn?.addEventListener('click', () => {
showAllExpenses = true;
applyFilters();
if (viewAllBtn) viewAllBtn.style.display = 'none';
});

// --- Expenses ---
function listenForExpenses(uid, projectId) {
if (expensesUnsubscribe) expensesUnsubscribe();
if (!uid || !projectId) {
allExpensesForProject = [];
applyFilters();
updateSummaries([]);
return;
};
const appId = "construction-expenses";
const expensesRef = collection(db, `artifacts/${appId}/users/${uid}/expenses`);
const q = query(expensesRef, where("projectId", "==", projectId));

expensesUnsubscribe = onSnapshot(q, (snapshot) => {
if (snapshot.metadata.fromCache) return;

allExpensesForProject = snapshot.docs.map(doc => ({
id: doc.id, ...doc.data()
}));
allExpensesForProject.sort((a, b) => new Date(b.date) - new Date(a.date));
applyFilters();
updateSummaries(allExpensesForProject);
});
}

const applyFilters = () => {
if (!searchInput) return;
const searchTerm = searchInput.value.toLowerCase();
const startDate = startDateInput.value;
const endDate = endDateInput.value;

const isFiltering = searchTerm !== '' || startDate !== '' || endDate !== '';
let filtered = allExpensesForProject;

if (isFiltering) {
filtered = allExpensesForProject.filter(exp =>
(exp.material.toLowerCase().includes(searchTerm)) &&
(!startDate || exp.date >= startDate) &&
(!endDate || exp.date <= endDate)
);
} else {
filtered = showAllExpenses ? allExpensesForProject: allExpensesForProject.slice(0, 5);
}

if (!isFiltering && !showAllExpenses && allExpensesForProject.length > 5) {
if (viewAllBtn) viewAllBtn.style.display = 'block';
} else {
if (viewAllBtn) viewAllBtn.style.display = 'none';
}

renderExpenses(filtered);
};

[searchInput, startDateInput, endDateInput].forEach(el => el?.addEventListener('input', applyFilters));

const formatDate = (date) => {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
return `${year}-${month}-${day}`;
};

const setDateFilter = (timeframe) => {
const endDate = new Date();
const startDate = new Date();

switch (timeframe) {
case 'last-week':
startDate.setDate(startDate.getDate() - 7);
break;
case 'last-month':
startDate.setMonth(startDate.getMonth() - 1);
break;
case 'last-year':
startDate.setFullYear(startDate.getFullYear() - 1);
break;
}

if (startDateInput) startDateInput.value = formatDate(startDate);
if (endDateInput) endDateInput.value = formatDate(endDate);

applyFilters();
};

const btnLastWeek = document.getElementById('last-week');
const btnLastMonth = document.getElementById('last-month');
const btnLastYear = document.getElementById('last-year');

btnLastWeek?.addEventListener('click', () => setDateFilter('last-week'));
btnLastMonth?.addEventListener('click', () => setDateFilter('last-month'));
btnLastYear?.addEventListener('click', () => setDateFilter('last-year'));


expenseForm?.addEventListener('submit', async e => {
e.preventDefault();
if (!currentUser || !activeProjectId || !navigator.onLine) {
if (!navigator.onLine) showToast("Please connect to internet", "error");
return;
}
const material = document.getElementById('material-name').value.trim();
const cost = parseFloat(document.getElementById('cost').value);
const date = document.getElementById('date').value;

if (material && !isNaN(cost) && date) {
const appId = "construction-expenses";
const newRef = doc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/expenses`));
try {
await runTransaction(db, async (t) => {
t.set(newRef, {
material, cost, date, projectId: activeProjectId, paymentStatus: paymentStatus.value, address: address.value.trim(), additionalInfo: additionalInfo.value.trim()});
});
expenseForm.reset();
document.getElementById('date').valueAsDate = new Date();

showToast("Expense added successfully!", "success");

} catch (err) {
showToast("Network Error: Data not saved.", "error");
}
}
});


// --- Render, CRUD, Utils ---
function renderExpenses(expenses) {
if (!expenseList) return;
if (expenses.length === 0) {
expenseList.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No expenses found.</td></tr>`;
return;
}
expenseList.innerHTML = expenses.map(expense => `<tr><td>
<div class="px-6 py-4">
<div class="font-bold text-lg">${escapeHTML(expense.material)}</div>
${expense.address?`<div class="text-sm text-slate-500">${escapeHTML(expense.address)}</div>`: ''}

<div class="flex justify-between items-center mt-2">
<div class="font-bold text-lg">₹${expense.cost.toLocaleString('en-IN')}</div>
<div class="${(expense.paymentStatus || '').toLowerCase() == 'paid'?'status-paid': 'status-unpaid'}">${escapeHTML(expense.paymentStatus || 'Unpaid')}</div>
</div>

${expense.additionalInfo?`<div class="mt-3"><div class="text-xs text-slate-400">Additional Information</div><div>${escapeHTML(expense.additionalInfo)}</div></div>`: ''}

<div class="flex justify-between items-center mt-3">
<div class="text-sm text-slate-600">${new Date(expense.date).toLocaleDateString('en-IN', {
timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric'
})}</div>
<div class="flex gap-3">
<button data-id="${expense.id}" class="edit-btn text-indigo-600">Edit</button>
<button data-id="${expense.id}" class="delete-btn text-red-600">Delete</button>
</div>
</div>
</div></td></tr>`).join('');

document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', handleDelete));
document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', handleEdit));
}

async function handleDelete(event) {
const id = event.target.dataset.id;

if (!navigator.onLine) {
showToast("Please connect to internet", "error");
return;
}
if (!id) return;

const isConfirmed = await showConfirm("Delete Expense", "Are you sure you want to delete this expense? This action cannot be undone.");

if (isConfirmed) {
if (!navigator.onLine) {
showToast("Cannot delete while offline.", "error");
return;
}

const appId = "construction-expenses";
const docRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/expenses`, id);
try {
await runTransaction(db, async (t) => {
t.delete(docRef);
});
showToast("Expense deleted", "success");
} catch (err) {
showToast("Delete failed: Network error.", "error");
}
}
}

function handleEdit(event) {
const id = event.target.dataset.id;
const expense = allExpensesForProject.find(e => e.id === id);
if (!expense) return;
document.getElementById('edit-expense-id').value = expense.id;
document.getElementById('edit-material-name').value = expense.material;
document.getElementById('edit-cost').value = expense.cost;
document.getElementById('edit-date').value = expense.date;
editPaymentStatus.value = expense.paymentStatus || 'Paid';
editAddress.value = expense.address || '';
editAdditionalInfo.value = expense.additionalInfo || '';

editModal.classList.remove('hidden');
document.body.classList.add('overflow-hidden'); 
}

editExpenseForm?.addEventListener('submit', async e => {
e.preventDefault();
if (!navigator.onLine) {
showToast("Offline: Cannot update.", "error"); return;
}
const id = document.getElementById('edit-expense-id').value;
const updatedData = {
material: document.getElementById('edit-material-name').value.trim(),
cost: parseFloat(document.getElementById('edit-cost').value),
date: document.getElementById('edit-date').value,
paymentStatus: editPaymentStatus.value,
address: editAddress.value.trim(),
additionalInfo: editAdditionalInfo.value.trim()};
if (updatedData.material && !isNaN(updatedData.cost) && updatedData.date) {
const appId = "construction-expenses";
const docRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/expenses`, id);
try {
await runTransaction(db, async (t) => {
t.update(docRef, updatedData);
});
closeEditModal();

showToast("Expense updated successfully!", "success");

} catch (err) {
showToast("Update failed: Check connection.", "error");
}
}
});


function handleEditProject(e) {
const projectId = e.target.dataset.projectId, projectName = e.target.dataset.projectName;
document.getElementById('edit-project-id').value = projectId;
document.getElementById('edit-project-name').value = projectName;

editProjectModal.classList.remove('hidden');
document.body.classList.add('overflow-hidden');
}

async function handleDeleteProject(e) {
const projectId = e.target.dataset.projectId, projectName = e.target.dataset.projectName;

if (!navigator.onLine) {
showToast("Please connect to internet", "error"); return;
}
if (!projectId) return;

const isConfirmed = await showConfirm("Delete Project", `Are you sure? All expenses in "${projectName}" will be permanently deleted.`);

if (isConfirmed) {
if (!navigator.onLine) {
showToast("Cannot delete while offline.", "error");
return;
}

const appId = "construction-expenses";
const expensesRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/expenses`);
const q = query(expensesRef, where("projectId", "==", projectId));

try {
const snapshot = await getDocs(q);
const batch = writeBatch(db);
snapshot.forEach(d => batch.delete(d.ref));
batch.delete(doc(db, `artifacts/${appId}/users/${currentUser.uid}/projects`, projectId));
await batch.commit();

showToast("Project deleted", "success");

if (activeProjectId === projectId) {
const generalProject = projects.find(p => p.name === 'General') || projects[0];
if (generalProject) {
activeProjectId = generalProject.id;
localStorage.setItem('lastActiveProjectId', activeProjectId);
updateActiveProject();
} else {
activeProjectId = null;
localStorage.removeItem('lastActiveProjectId');
}
}
} catch (error) {
showToast("Delete failed: Network error.", "error");
}
}
}

editProjectForm?.addEventListener('submit', async e => {
e.preventDefault();
if (!navigator.onLine) {
showToast("Please connect to internet", "error"); return;
}
const projectId = document.getElementById('edit-project-id').value,
newName = document.getElementById('edit-project-name').value.trim();

if (newName && projectId) {
const appId = "construction-expenses";
const projectRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/projects`, projectId);
try {
await runTransaction(db, async (t) => {
t.update(projectRef, {
name: newName
});
});
closeEditProjectModal();

showToast("Project renamed successfully!", "success");

} catch (err) {
showToast("Rename failed.", "error");
}
}
});

// --- Modal Closers ---
const closeEditModal = () => {
editModal?.classList.add('hidden');
document.body.classList.remove('overflow-hidden'); 
};
cancelEditBtn?.addEventListener('click', closeEditModal);
editModal?.addEventListener('click', e => {
if (e.target === editModal) closeEditModal();
});

const closeEditProjectModal = () => {
editProjectModal?.classList.add('hidden');
document.body.classList.remove('overflow-hidden');
};
cancelEditProjectBtn?.addEventListener('click', closeEditProjectModal);
editProjectModal?.addEventListener('click', e => {
if (e.target === editProjectModal) closeEditProjectModal();
});

const closeAddProjectModal = () => {
addProjectModal?.classList.add('hidden');
document.body.classList.remove('overflow-hidden');
};
cancelAddProjectBtn?.addEventListener('click', closeAddProjectModal);
addProjectModal?.addEventListener('click', e => {
if (e.target === addProjectModal) closeAddProjectModal();
});

// --- Info Modals ---
const infoContent = {
'about-link': {
title: 'About Us',
content: `
<div class="space-y-4 font-sans">
<p class="leading-relaxed text-gray-600">
Welcome to <strong>Bhaskarjyoti Club</strong>, your ultimate solution to track materials and project costs with ease.
</p>
<p class="leading-relaxed text-gray-600">
Our mission is to simplify financial tracking for individuals, freelancers, and project managers. By providing real-time insights into your spending and budget allocation, we help you make informed financial decisions.
</p>
<p class="leading-relaxed text-gray-600">
Built with speed and reliability in mind, it takes the headache out of expense management so you can focus on what matters most.
</p>
</div>
`
},
'privacy-link': {
title: 'Privacy Policy',
content: `
<div class="space-y-4 font-sans text-sm text-gray-600">
<section>
<h3 class="font-semibold text-gray-800">1. Introduction</h3>
<p>We are committed to protecting your personal data when you use.</p>
</section>

<section>
<h3 class="font-semibold text-gray-800">2. Data We Collect</h3>
<p>We collect basic <strong>Identity Data</strong> (email, profile) and <strong>Financial Data</strong> (expenses, incomes, budgets, transactions) to provide our service.</p>
</section>

<section>
<h3 class="font-semibold text-gray-800">3. Storage & Security</h3>
<p>Your data is authenticated and securely stored using <strong>Google Firebase</strong>. We rely on Firebase's robust encryption and strict security rules to ensure your financial information remains completely private and accessible only by you.</p>
</section>
</div>
`
},

'contact-link': {
title: 'Contact Us',
content: `
<div class="space-y-5 font-sans">
<p class="leading-relaxed text-gray-600">
We're here to help! Whether you have a question about a feature, need technical support, or want to provide feedback, feel free to reach out to our team.
</p>

<div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
<h3 class="text-gray-900 font-semibold mb-1 flex items-center">
<svg class="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
Email Support
</h3>
<p class="text-gray-600 mb-2">Drop us a line and we'll get back to you as soon as possible.</p>
<p class="no-underline text-blue-600 hover:text-blue-800 font-medium underline transition-colors">
support@bhaskarjyoticlub.web.app
</p>
<p class="text-xs text-gray-400 mt-3">We aim to respond to all inquiries within 24-48 hours.</p>
</div>
</div>
`
}
};


const navButtons = document.querySelectorAll('.nav-btn');

navButtons.forEach(button => {
button.addEventListener('click', (e) => {
const linkId = e.target.id;
const sectionData = infoContent[linkId];
if (sectionData) {
document.getElementById('display-title').innerHTML = sectionData.title;
document.getElementById('display-content').innerHTML = sectionData.content;
}
});
});


document.querySelectorAll('#about-link, #privacy-link, #contact-link').forEach(link => {
link.addEventListener('click',
e => {
e.preventDefault();
const {
title,
content
} = infoContent[e.currentTarget.id];
if (infoModalTitle) infoModalTitle.textContent = title;
if (infoModalContent) infoModalContent.innerHTML = content;

infoModal?.classList.remove('hidden');
document.body.classList.add('overflow-hidden');
});
});

const closeInfoModal = () => {
infoModal?.classList.add('hidden');
document.body.classList.remove('overflow-hidden'); 
};

closeInfoModalBtn?.addEventListener('click', closeInfoModal);
infoModal?.addEventListener('click', e => {
if (e.target === infoModal) closeInfoModal();
});

// --- Summaries ---
function updateSummaries(expenses) {
if (!finalExpensesEl) return;

const total = expenses.reduce((sum, exp) => sum + exp.cost, 0);
const totalPaid = expenses.filter(e => (e.paymentStatus || '').toLowerCase() == 'paid').reduce((a, b)=>a+b.cost, 0);
const totalUnpaid = expenses.filter(e => (e.paymentStatus || '').toLowerCase() != 'paid').reduce((a, b)=>a+b.cost, 0);
if (totalPaidEl) totalPaidEl.textContent = '₹'+totalPaid.toLocaleString('en-IN');
if (totalUnpaidEl) totalUnpaidEl.textContent = '₹'+totalUnpaid.toLocaleString('en-IN');

finalExpensesEl.textContent = `₹${total.toLocaleString('en-IN', {
minimumFractionDigits: 0, maximumFractionDigits: 2
})}`;

const materialTotals = expenses.reduce((acc, exp) => {
const key = exp.material.trim().toLowerCase();
acc[key] = (acc[key] || 0) + exp.cost;
return acc;
}, {});

const sorted = Object.keys(materialTotals).sort((a, b) => materialTotals[b] - materialTotals[a]);
if (sorted.length === 0) {
if (typeof materialSummaryEl !== 'undefined' && materialSummaryEl) materialSummaryEl.innerHTML = `<p class="text-gray-500">No expenses to summarize.</p>`;
return;
}

if (typeof materialSummaryEl !== 'undefined' && materialSummaryEl) {
materialSummaryEl.innerHTML = sorted.map(key => {
const total = materialTotals[key];
const displayName = key.charAt(0).toUpperCase() + key.slice(1);
return `<div class="flex justify-between items-center text-sm"><span class="font-medium">${escapeHTML(displayName)}</span><span>₹${total.toLocaleString('en-IN', {
minimumFractionDigits: 0, maximumFractionDigits: 2
})}</span></div>`;
}).join('');
}
}

const escapeHTML = (str) => {
const div = document.createElement('div'); div.appendChild(document.createTextNode(str || '')); return div.innerHTML;
};

// --- Admin Configuration Listener ---
let globalConfigUnsubscribe = null;
const ADMIN_EMAILS = [APP_EMAIL]; 

function listenForAppConfig() {
if (globalConfigUnsubscribe) return;

const configRef = doc(db, "artifacts/construction-expenses/config/appConfig");
globalConfigUnsubscribe = onSnapshot(configRef, (snapshot) => {
if (snapshot.exists()) {
applyGlobalConfig(snapshot.data());
}
});
}

function applyGlobalConfig(config) {
const isUserAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);
const maintenanceView = document.getElementById('maintenance-view');

if (config.maintenanceMode && !isUserAdmin) {
maintenanceView?.classList.remove('hidden');
maintenanceView?.classList.add('flex');
['auth-view',
'app-view',
'splash-view'].forEach(id => {
const el = document.getElementById(id);
if (el) el.classList.remove('active');
});
} else {
maintenanceView?.classList.add('hidden');
maintenanceView?.classList.remove('flex');
if (currentUser && maintenanceView?.classList.contains('hidden') === false) {
showView('app');
}
}

if (config.appName) {
document.querySelectorAll('.dynamic-app-name').forEach(el => el.textContent = config.appName);
document.title = config.appName;
}

if (config.primaryColor) {
document.documentElement.style.setProperty('--dynamic-primary', config.primaryColor);
document.querySelectorAll('.bg-indigo-600').forEach(el => {
el.style.backgroundColor = config.primaryColor;
});
document.querySelectorAll('.text-indigo-600').forEach(el => {
el.style.color = config.primaryColor;
});
}

const notifEl = document.getElementById('global-notification');
const notifText = document.getElementById('notification-text');

if (config.globalNotification && config.globalNotification.trim() !== "") {
if (notifText) notifText.textContent = config.globalNotification;
notifEl?.classList.remove('hidden');
} else {
notifEl?.classList.add('hidden');
}
}

document.getElementById('close-notification')?.addEventListener('click', () => {
document.getElementById('global-notification').classList.add('hidden');
});

listenForAppConfig();

// --- Service Worker ---
if ("serviceWorker" in navigator) {
window.addEventListener("load", () => {
navigator.serviceWorker.register("/service-worker.js");
});
}
let deferredPrompt;
const installBtn = document.getElementById("ibtn");
window.addEventListener("beforeinstallprompt", e => {
e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.classList.remove("hidden");
});
window.installApp = async () => {
if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; if (installBtn) installBtn.classList.add("hidden");
};
window.addEventListener("appinstalled", () => {
if (installBtn) installBtn.classList.add("hidden");
});

const userStatusDisplay = document.getElementById('user-status-display');
let statusTimeout;

function updateStatusUI(state) {
if (!userStatusDisplay) return;

userStatusDisplay.classList.add('opacity-0');

setTimeout(() => {
if (state === 'offline') {
userStatusDisplay.innerHTML = `
<span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
<span class="text-sm font-semibold">Offline</span>
`;
} else if (state === 'online') {
userStatusDisplay.innerHTML = `
<span class="relative flex size-3">
<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
<span class="relative inline-flex size-3 rounded-full bg-sky-500"></span>
</span>
<span class="text-sm font-semibold">Back Online</span>
`;
statusTimeout = setTimeout(() => updateStatusUI('welcome'), 5000);

} else if (state === 'welcome') {
userStatusDisplay.innerHTML = `<span class="text-sm text-gray-700">Welcome back, <strong>Admin</strong></span>`;
}

userStatusDisplay.classList.remove('opacity-0');
},
300);
}

window.addEventListener('offline', () => {
clearTimeout(statusTimeout);
updateStatusUI('offline');
});

window.addEventListener('online', () => {
clearTimeout(statusTimeout);
updateStatusUI('online');
});

document.getElementById('go-to-analytics-btn')?.addEventListener('click', () => {
if (!activeProjectId) {
showToast("Please select a project first.", "error");
return;
}
window.location.href = `analytics.html?projectId=${activeProjectId}`;
});

document.addEventListener('DOMContentLoaded', () => {
const shareButton = document.getElementById('shareFinTrackBtn');

const finTrackShareText = "I’ve been using to manage my expenses and get clear insights into my spending.\nIt’s simple, effective, and actually helps me stay on top of my finances. \n\nYou should give it a try 👍";

const appUrl = window.location.origin;

shareButton?.addEventListener('click', async () => {
if (navigator.share) {
try {
await navigator.share({
title: 'Check out',
text: finTrackShareText,
url: appUrl
});
console.log('Successfully shared');
} catch (error) {
console.error('Error sharing:', error);
}
} else {
const fullTextToCopy = `${finTrackShareText}${appUrl}`;

navigator.clipboard.writeText(fullTextToCopy).then(() => {
alert("Share message copied to clipboard!");
}).catch(err => {
console.error("Failed to copy text: ", err);
});
}
});
});

// App configuration
const APP_VERSION = "1.2";
const APP_NAME = "Bhaskarjyoti Club";
const currentYear = new Date().getFullYear();

const appVersionEl = document.getElementById("app-version");
const appCopyrightEl = document.getElementById("app-copyright");

if (appVersionEl) appVersionEl.textContent = `Version-${APP_VERSION}`;
if (appCopyrightEl) appCopyrightEl.textContent = `© ${currentYear} ${APP_NAME}. All Rights Reserved.`;
