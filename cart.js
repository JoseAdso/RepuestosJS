// 📦 cart.js - Manejador del carrito de compras para usuarios con cuenta Google

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { showModalClient } from "./utils.js"; // Si tienes una función reutilizable para modales

/**
 * Visualiza el carrito de compras del usuario autenticado con Google
 * @param {string} userId - ID del usuario autenticado
 * @param {boolean} isAnonymous - true si el usuario es anónimo
 */
export async function viewCart(userId, isAnonymous) {
  if (isAnonymous) {
    showModalClient("Acceso Denegado", "Debes iniciar sesión con Google para ver tu carrito de compras.");
    return;
  }

  try {
    const db = getFirestore();
    const cartRef = collection(db, `orders/${userId}/myOrders`);
    const snapshot = await getDocs(cartRef);

    if (snapshot.empty) {
      showModalClient("Carrito", "Tu carrito está vacío.");
      return;
    }

    let summary = '';
    snapshot.forEach(doc => {
      const item = doc.data();
      summary += `\n- ${item.productName} ($${item.price})`;
    });

    showModalClient("Tu Carrito", `Productos comprados:${summary}`);

  } catch (e) {
    console.error("Error al obtener el carrito:", e);
    showModalClient("Error", "No se pudo obtener el carrito de compras.");
  }
}
