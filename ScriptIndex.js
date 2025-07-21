// ✅ ScriptIndex.js con restricción de roles para anónimo y Google

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxYd9_bFQa_j0-2aZ-K3bXfaJjqorusVU",
  authDomain: "jstyle420-5abf1.firebaseapp.com",
  projectId: "jstyle420-5abf1",
  storageBucket: "jstyle420-5abf1.appspot.com",
  messagingSenderId: "553942048420",
  appId: "1:553942048420:web:5e48decf23b5c2d353d031",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authStatus = document.getElementById("auth-status");
const userIdDisplay = document.getElementById("user-id-display");
const loginButton = document.getElementById("login-button");
const googleLoginButton = document.getElementById("google-login-button");
const messageModal = document.getElementById("message-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalConfirmButton = document.getElementById("modal-confirm-button");
const modalCloseButton = document.getElementById("modal-close-button");
const roleAdminRadio = document.getElementById("role-admin");
const roleClientRadio = document.getElementById("role-client");

function showModal(title, message, showConfirm = false) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirmButton.classList.toggle("hidden", !showConfirm);
    messageModal.classList.remove("hidden");
    modalConfirmButton.onclick = () => {
      messageModal.classList.add("hidden");
      resolve(true);
    };
    modalCloseButton.onclick = () => {
      messageModal.classList.add("hidden");
      resolve(false);
    };
  });
}

async function saveUserRole(userUid, role) {
  try {
    await setDoc(
      doc(db, "users", userUid),
      {
        role: role,
        lastLogin: new Date(),
      },
      { merge: true }
    );
    console.log(`Rol '${role}' guardado para el usuario ${userUid}`);
  } catch (error) {
    console.error("Error al guardar el rol del usuario:", error);
    await showModal(
      "Error de Guardado",
      `No se pudo guardar el rol. Detalles: ${error.message}`
    );
  }
}

async function getUserRole(userUid) {
  try {
    const userDocRef = doc(db, "users", userUid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data().role;
    }
    return null;
  } catch (error) {
    console.error("Error al obtener el rol del usuario:", error);
    return null;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRole = await getUserRole(user.uid);
    if (userRole) {
      authStatus.textContent = `¡Sesión iniciada como ${
        user.displayName || user.email || "anónimo"
      } (${userRole})!`;
      userIdDisplay.textContent = `ID: ${user.uid}`;
    }
  } else {
    authStatus.textContent = "Por favor, inicia sesión para continuar.";
    userIdDisplay.textContent = "";
  }
});

// 🟢 INICIO ANÓNIMO (solo para clientes)
loginButton.addEventListener("click", async () => {
  const selectedRole = roleAdminRadio.checked ? "admin" : "client";

  if (selectedRole === "admin") {
    await showModal("Acceso Restringido", "Solo los usuarios con Google pueden acceder como administrador.");
    return;
  }

  try {
    const userCredential = await signInAnonymously(auth);
    await saveUserRole(userCredential.user.uid, selectedRole);
    window.location.href = "client.html";
  } catch (error) {
    console.error("Error al iniciar sesión anónimamente:", error);
    await showModal(
      "Error de Autenticación",
      `No se pudo iniciar sesión anónimamente. Detalles: ${error.message}`
    );
  }
});

// 🟢 LOGIN CON GOOGLE (admin o cliente)
googleLoginButton.addEventListener("click", async () => {
  const selectedRole = roleAdminRadio.checked ? "admin" : "client";
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await saveUserRole(userCredential.user.uid, selectedRole);

    if (selectedRole === "admin") {
      window.location.href = "main.html";
    } else {
      window.location.href = "client.html";
    }
  } catch (error) {
    console.error("Error al iniciar sesión con Google:", error);
    let errorMessage = error.message;
    if (error.code === "auth/popup-closed-by-user") {
      errorMessage = "La ventana de inicio de sesión fue cerrada.";
    } else if (error.code === "auth/cancelled-popup-request") {
      errorMessage = "Solicitud de login cancelada.";
    }
    await showModal("Error de Autenticación", errorMessage);
  }
});
