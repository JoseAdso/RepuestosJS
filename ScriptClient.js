// ✅ ScriptClient.js actualizado con función de carrito incluida para cuentas Google
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    runTransaction,
    addDoc,
    deleteDoc // Importar deleteDoc para eliminar documentos
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxYd9_bFQa_j0-2aZ-K3bXfaJjqorusVU",
    authDomain: "jstyle420-5abf1.firebaseapp.com",
    projectId: "jstyle420-5abf1",
    storageBucket: "jstyle420-5abf1.appspot.com",
    messagingSenderId: "553942048420",
    appId: "1:553942048420:web:5e48decf23b5c2d353d031"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userId = null;
let isAnonymousUser = false;
let allProducts = []; // Variable para almacenar todos los productos

const userIdDisplayClient = document.getElementById('user-id-display-client');
const logoutButtonClient = document.getElementById('logout-button-client');
const clientProductList = document.getElementById('client-product-list');
const searchInputClient = document.getElementById('search-input-client');
const cartButton = document.getElementById('cart-button');
const messageModalClient = document.getElementById('message-modal-client');
const modalTitleClient = document.getElementById('modal-title-client');
const modalMessageClient = document.getElementById('modal-message-client');
const modalCloseButtonClient = document.getElementById('modal-close-button-client');

// 🔁 MODAL DE CARRITO
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartCloseButton = document.getElementById('cart-close-button');
const cartBuyButton = document.getElementById('cart-buy-button');

function showModalClient(title, message) {
    modalTitleClient.textContent = title;
    modalMessageClient.textContent = message;
    messageModalClient.classList.remove('hidden');
    modalCloseButtonClient.onclick = () => {
        messageModalClient.classList.add('hidden');
    };
}

function highlightStars(starElement, rating) {
    const stars = starElement.parentElement.children;
    for (let i = 0; i < stars.length; i++) {
        stars[i].classList.toggle('filled', i < rating);
    }
}

async function voteProduct(productId, rating) {
    if (isAnonymousUser) {
        showModalClient("Acción no permitida", "Debes iniciar sesión con Google para votar.");
        return;
    }

    const productRef = doc(db, `artifacts/${firebaseConfig.appId}/public/data/products`, productId);
    const userRatingRef = doc(db, `artifacts/${firebaseConfig.appId}/public/data/products/${productId}/ratings`, userId);

    await runTransaction(db, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        const userRatingSnap = await transaction.get(userRatingRef);

        if (!productSnap.exists()) throw new Error("Producto no encontrado");

        const data = productSnap.data();
        const totalRating = data.totalRating || 0;
        const numRatings = data.numRatings || 0;

        let newTotalRating = totalRating;
        let newNumRatings = numRatings;

        if (userRatingSnap.exists()) {
            const oldRating = userRatingSnap.data().rating;
            newTotalRating = totalRating - oldRating + rating;
        } else {
            newTotalRating = totalRating + rating;
            newNumRatings = numRatings + 1;
        }

        const averageRating = newTotalRating / newNumRatings;

        transaction.set(userRatingRef, {
            rating,
            userId,
            timestamp: new Date()
        });

        transaction.set(productRef, {
            totalRating: newTotalRating,
            numRatings: newNumRatings,
            averageRating
        }, {
            merge: true
        });
    });

    showModalClient("Gracias", `Tu puntuación de ${rating} estrellas ha sido registrada.`);
}

function renderStars(productId, avg, userRating) {
    const container = document.createElement('div');
    container.className = 'star-rating-container'; // Añadir la clase para el contenedor de estrellas
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.innerHTML = ' ★ ';
        star.className = 'star';
        if (i <= avg) star.classList.add('filled');
        if (!isAnonymousUser) {
            star.addEventListener('mouseover', () => highlightStars(star, i));
            star.addEventListener('mouseout', () => highlightStars(star, userRating));
            star.addEventListener('click', () => voteProduct(productId, i));
        }
        container.appendChild(star);
    }
    return container;
}

async function buyProduct(productId, name, price) {
    if (isAnonymousUser) {
        showModalClient("No permitido", "Solo las cuentas de Google pueden comprar.");
        return;
    }

    const confirmed = confirm(`¿Deseas comprar '${name}' por $${price}?`);
    if (!confirmed) return;

    const productRef = doc(db, `artifacts/${firebaseConfig.appId}/public/data/products`, productId);
    const orderRef = collection(db, `orders/${userId}/myOrders`);

    try {
        await runTransaction(db, async (transaction) => {
            const productSnap = await transaction.get(productRef);
            if (!productSnap.exists()) throw new Error("Producto no encontrado");

            const productData = productSnap.data();
            const stock = productData.quantity || 0;

            if (stock <= 0) throw new Error("Producto agotado");

            transaction.update(productRef, {
                quantity: stock - 1
            });

            await addDoc(orderRef, {
                userId,
                productId,
                productName: name,
                price,
                timestamp: new Date().toISOString()
            });
        });

        showModalClient("Compra exitosa", `Has comprado '${name}' por $${price}`);
    } catch (e) {
        console.error("Error en la compra:", e);
        showModalClient("Error de compra", e.message);
    }
}

// NUEVA FUNCIÓN: Eliminar ítem del carrito
async function deleteCartItem(orderDocId) {
    if (isAnonymousUser) {
        showModalClient("Acceso Denegado", "Debes iniciar sesión con Google para modificar tu carrito.");
        return;
    }

    const confirmed = confirm("¿Estás seguro de que quieres eliminar este artículo del carrito?");
    if (!confirmed) return;

    try {
        const itemRef = doc(db, `orders/${userId}/myOrders`, orderDocId);
        await deleteDoc(itemRef);
        showModalClient("Eliminado", "Artículo eliminado del carrito.");
        viewCart(); // Volver a cargar el carrito para actualizar la vista
    } catch (e) {
        console.error("Error al eliminar del carrito:", e);
        showModalClient("Error", "No se pudo eliminar el artículo del carrito.");
    }
}

// 🔁 FUNCIÓN: Ver Carrito
async function viewCart() {
    if (isAnonymousUser) {
        showModalClient("Acceso Denegado", "Debes iniciar sesión con Google para ver tu carrito de compras.");
        return;
    }

    try {
        const cartRef = collection(db, `orders/${userId}/myOrders`);
        const snapshot = await getDocs(cartRef);

        if (snapshot.empty) {
            // ✅ CAMBIO AQUÍ: Mensaje más amigable para carrito vacío
            cartItemsContainer.innerHTML = '<p class="text-center table-empty-message">Tu carrito está vacío. ¡Compra algo para empezar!</p>';
            cartBuyButton.classList.add('hidden'); // Ocultar el botón de comprar si el carrito está vacío
        } else {
            let summaryHtml = '<ul class="cart-list">'; // Usa una lista para los elementos del carrito
            snapshot.forEach(doc => {
                const item = doc.data();
                // Incluir el ID del documento en el botón de eliminar para poder referenciarlo
                summaryHtml += `
                    <li>
                        ${item.productName} - $${item.price}
                        <button class="btn btn-danger btn-delete-cart-item" data-id="${doc.id}">Eliminar</button>
                    </li>
                `;
            });
            summaryHtml += '</ul>';
            cartItemsContainer.innerHTML = summaryHtml;
            cartBuyButton.classList.add('hidden'); // Ocultar el botón de comprar, ya que no se quiere mostrar
        }

        cartModal.classList.remove('hidden');
        cartCloseButton.onclick = () => cartModal.classList.add('hidden');

        // Adjuntar listeners a los botones de eliminar después de que se renderice el HTML del carrito
        const deleteButtons = cartItemsContainer.querySelectorAll('.btn-delete-cart-item');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const orderDocId = event.target.dataset.id;
                deleteCartItem(orderDocId);
            });
        });

    } catch (e) {
        // Este bloque catch solo se ejecutaría si hay un problema REAL al comunicarse con Firebase
        // No debería activarse si la colección simplemente está vacía.
        console.error("Error al obtener el carrito:", e);
        showModalClient("Error", "No se pudo obtener el carrito de compras. Por favor, inténtalo de nuevo.");
    }
}


function renderProductRow(product) {
    const row = document.createElement('tr');
    const avg = Math.round(product.averageRating || 0);

    row.innerHTML = `
        <td>${product.name}</td>
        <td>${product.description || ''}</td>
        <td>$${parseFloat(product.salePrice || 0).toFixed(2)}</td>
        <td>${product.quantity > 0 ? product.quantity : 'Agotado'}</td>
        <td class="rating-cell"></td>
        <td>
            <button class="btn btn-primary btn-buy" data-id="${product.id}" data-name="${product.name}" data-price="${product.salePrice}" data-stock="${product.quantity}">Comprar</button>
        </td>
    `;
    const ratingCell = row.querySelector('.rating-cell');
    const userRating = product._userRating || 0;
    ratingCell.appendChild(renderStars(product.id, avg, userRating));

    const buyBtn = row.querySelector('.btn-buy');
    if (product.quantity <= 0) { // Deshabilitar si está agotado
        buyBtn.disabled = true;
        buyBtn.textContent = 'Agotado';
        buyBtn.classList.remove('btn-primary');
        buyBtn.classList.add('btn-secondary'); // Estilo diferente para agotado
    } else if (isAnonymousUser) {
        buyBtn.disabled = true;
        buyBtn.textContent = 'Solo Google';
        buyBtn.classList.remove('btn-primary');
        buyBtn.classList.add('btn-secondary'); // Estilo diferente para usuario anónimo
    } else {
        buyBtn.addEventListener('click', () => buyProduct(product.id, product.name, product.salePrice));
    }

    // No lo añadimos directamente al clientProductList aquí, lo hacemos en filterAndRenderProducts
    return row;
}

// NUEVA FUNCIÓN: Filtrar y renderizar productos
function filterAndRenderProducts() {
    const searchTerm = searchInputClient.value.toLowerCase();
    clientProductList.innerHTML = ''; // Limpiar la lista actual

    const filteredProducts = allProducts.filter(product => {
        const nameMatch = product.name ? product.name.toLowerCase().includes(searchTerm) : false;
        const descriptionMatch = product.description ? product.description.toLowerCase().includes(searchTerm) : false;
        const idMatch = product.id ? product.id.toLowerCase().includes(searchTerm) : false;
        return nameMatch || descriptionMatch || idMatch;
    });

    if (filteredProducts.length === 0) {
        clientProductList.innerHTML = `<tr><td colspan="6" class="text-center table-empty-message">No se encontraron productos que coincidan con la búsqueda.</td></tr>`;
    } else {
        filteredProducts.forEach(product => {
            clientProductList.appendChild(renderProductRow(product));
        });
    }
}

// Listener para el campo de búsqueda
searchInputClient.addEventListener('input', filterAndRenderProducts);


function listenProducts() {
    const colRef = collection(db, `artifacts/${firebaseConfig.appId}/public/data/products`);
    onSnapshot(colRef, async (snapshot) => {
        allProducts = []; // Vaciar el array antes de rellenarlo con nuevos datos
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const id = docSnap.id;
            const product = {
                id,
                ...data
            };
            if (!isAnonymousUser) {
                const userRatingRef = doc(db, `artifacts/${firebaseConfig.appId}/public/data/products/${id}/ratings`, userId);
                const userRatingSnap = await getDoc(userRatingRef);
                if (userRatingSnap.exists()) {
                    product._userRating = userRatingSnap.data().rating;
                }
            }
            allProducts.push(product); // Almacenar todos los productos
        }
        filterAndRenderProducts(); // Renderizar los productos (filtrados si hay búsqueda)
    });
}

logoutButtonClient.addEventListener('click', async () => {
    await signOut(auth);
    location.href = 'index.html';
});

onAuthStateChanged(auth, (user) => {
    if (!user) {
        location.href = 'index.html';
        return;
    }
    userId = user.uid;
    isAnonymousUser = user.isAnonymous;
    userIdDisplayClient.textContent = `Usuario: ${user.displayName || 'Anónimo'} (ID: ${userId})`;

    // Manejo de visibilidad del botón de carrito y su listener
    if (!isAnonymousUser) {
        cartButton.classList.remove('hidden');
        cartButton.addEventListener('click', viewCart);
    } else {
        cartButton.classList.add('hidden'); // Asegurarse de que esté oculto para anónimos
        cartButton.removeEventListener('click', viewCart); // Remover el listener si el usuario cambia a anónimo
    }

    listenProducts();
});

// Listener para el botón de cerrar del modal de carrito
cartCloseButton.addEventListener('click', () => {
    cartModal.classList.add('hidden');
});

// El botón de "Comprar" del modal de carrito ahora no tiene una funcionalidad activa de compra masiva.
// Si deseas añadirla en el futuro, puedes descomentar y modificar esta parte.
cartBuyButton.addEventListener('click', () => {
    showModalClient("Funcionalidad Pendiente", "La compra de todo el carrito aún no está implementada. Puedes comprar productos individualmente desde la lista principal.");
    cartModal.classList.add('hidden');
});