// ScriptLogin.js (asumimos que este es el script de la página main.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxYd9_bFQa_j0-2aZ-K3bXfaJjqorusVU",
    authDomain: "jstyle420-5abf1.firebaseapp.com",
    projectId: "jstyle420-5abf1",
    storageBucket: "jstyle420-5abf1.firebasestorage.app",
    messagingSenderId: "553942048420",
    appId: "1:553942048420:web:5e48decf23b5c2d353d031"
};

const appId = firebaseConfig.appId || 'default-app-id-local';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userId = null;
let currentEditingProductId = null;
const userIdDisplayMain = document.getElementById('user-id-display-main');
const logoutButtonMain = document.getElementById('logout-button-main');
const productManagementSection = document.getElementById('product-management-section');
const productForm = document.getElementById('product-form');
const productNameInput = document.getElementById('product-name');
const productDescriptionInput = document.getElementById('product-description');
const productCodeInput = document.getElementById('product-code');
const productSupplierInput = document.getElementById('product-supplier');
const productPurchasePriceInput = document.getElementById('product-purchase-price');
const productSalePriceInput = document.getElementById('product-sale-price');
const productQuantityInput = document.getElementById('product-quantity');
const productLocationInput = document.getElementById('product-location');
const saveProductButton = document.getElementById('save-product-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const productList = document.getElementById('product-list');
const searchInput = document.getElementById('search-input');
const messageModalMain = document.getElementById('message-modal-main');
const modalTitleMain = document.getElementById('modal-title-main');
const modalMessageMain = document.getElementById('modal-message-main');
const modalConfirmButtonMain = document.getElementById('modal-confirm-button-main');
const modalCloseButtonMain = document.getElementById('modal-close-button-main');

function showModalMain(title, message, showConfirm = false) {
    return new Promise((resolve) => {
        modalTitleMain.textContent = title;
        modalMessageMain.textContent = message;
        modalConfirmButtonMain.classList.toggle('hidden', !showConfirm);
        messageModalMain.classList.remove('hidden');
        modalConfirmButtonMain.onclick = () => {
            messageModalMain.classList.add('hidden');
            resolve(true);
        };
        modalCloseButtonMain.onclick = () => {
            messageModalMain.classList.add('hidden');
            resolve(false);
        };
    });
}

// Función para obtener el rol del usuario de Firestore
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
        userId = user.uid;
        userIdDisplayMain.textContent = `Usuario: ${user.displayName || user.email || 'anónimo'} (ID: ${userId})`;
        
        const userRole = await getUserRole(user.uid);
        if (userRole === 'admin') {
            productManagementSection.classList.remove('hidden'); // Muestra la sección de gestión de productos
            listenForProducts();
        } else {
            // Si el usuario no es administrador, redirigirlo o mostrar un mensaje de acceso denegado
            alert("Acceso denegado. Esta página es solo para administradores.");
            window.location.href = 'index.html'; // Redirigir al inicio o a la página de cliente
        }
    } else {
        userId = null;
        window.location.href = 'index.html'; // Redirigir al login si no hay usuario autenticado
    }
});

logoutButtonMain.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html'; // Redirigir al login después de cerrar sesión
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        await showModalMain("Error al Cerrar Sesión", `No se pudo cerrar sesión. Detalles: ${error.message}`);
    }
});

async function addProduct(productData) {
    if (!userId) {
        await showModalMain("Error", "Debes iniciar sesión para añadir productos.");
        return;
    }
    try {
        const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/products`), {
            ...productData,
            createdAt: new Date(),
            createdBy: userId
        });
        await showModalMain("Producto Añadido", "¡El producto se ha añadido correctamente!");
        productForm.reset();
    } catch (e) {
        console.error("Error al añadir producto: ", e);
        await showModalMain("Error", `No se pudo añadir el producto. Detalles: ${e.message}`);
    }
}

async function updateProduct(productId, productData) {
    if (!userId) {
        await showModalMain("Error", "Debes iniciar sesión para actualizar productos.");
        return;
    }
    try {
        const productRef = doc(db, `artifacts/${appId}/public/data/products`, productId);
        await updateDoc(productRef, productData);
        await showModalMain("Producto Actualizado", "¡El producto se ha actualizado correctamente!");
        productForm.reset();
        saveProductButton.textContent = 'Añadir Producto';
        cancelEditButton.classList.add('hidden');
        currentEditingProductId = null;
    } catch (e) {
        console.error("Error al actualizar producto: ", e);
        await showModalMain("Error", `No se pudo actualizar el producto. Detalles: ${e.message}`);
    }
}

async function deleteProduct(productId) {
    if (!userId) {
        await showModalMain("Error", "Debes iniciar sesión para eliminar productos.");
        return;
    }
    const confirmed = await showModalMain("Confirmar Eliminación", "¿Estás seguro de que quieres eliminar este producto?", true);
    if (!confirmed) return;
    try {
        const productRef = doc(db, `artifacts/${appId}/public/data/products`, productId);
        await deleteDoc(productRef);
        await showModalMain("Producto Eliminado", "¡El producto se ha eliminado correctamente!");
    } catch (e) {
        console.error("Error al eliminar producto: ", e);
        await showModalMain("Error", `No se pudo eliminar el producto. Detalles: ${e.message}`);
    }
}

function renderProducts(products) {
    productList.innerHTML = '';
    if (products.length === 0) {
        productList.innerHTML = `<tr><td colspan="6" class="table-empty-message">No hay productos registrados.</td></tr>`;
        return;
    }
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.code}</td>
            <td>${product.quantity}</td>
            <td>$${product.salePrice.toFixed(2)}</td>
            <td>${product.location || 'N/A'}</td>
            <td class="table-actions-cell">
                <button class="btn btn-primary btn-small" onclick="editProduct('${product.id}')">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deleteProduct('${product.id}')">Eliminar</button>
            </td>
        `;
        productList.appendChild(row);
    });
}

window.editProduct = async (productId) => {
    try {
        const productRef = doc(db, `artifacts/${appId}/public/data/products`, productId);
        const docSnap = await getDoc(productRef);
        if (docSnap.exists()) {
            const productToEdit = { id: docSnap.id, ...docSnap.data() };
            currentEditingProductId = productId;
            productNameInput.value = productToEdit.name;
            productDescriptionInput.value = productToEdit.description || '';
            productCodeInput.value = productToEdit.code;
            productSupplierInput.value = productToEdit.supplier || '';
            productPurchasePriceInput.value = productToEdit.purchasePrice;
            productSalePriceInput.value = productToEdit.salePrice;
            productQuantityInput.value = productToEdit.quantity;
            productLocationInput.value = productToEdit.location || '';
            saveProductButton.textContent = 'Actualizar Producto';
            cancelEditButton.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            await showModalMain("Error", "Producto no encontrado para editar.");
        }
    } catch (e) {
        console.error("Error al obtener producto para editar:", e);
        await showModalMain("Error", `No se pudo cargar el producto para edición. Detalles: ${e.message}`);
    }
};

window.deleteProduct = deleteProduct;

function listenForProducts() {
    if (!userId) {
        console.log("No hay ID de usuario disponible para escuchar productos.");
        return;
    }
    const productsColRef = collection(db, `artifacts/${appId}/public/data/products`);
    onSnapshot(productsColRef, (snapshot) => {
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        products.sort((a, b) => a.name.localeCompare(b.name));
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.code.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
        renderProducts(filteredProducts);
    }, (error) => {
        console.error("Error al escuchar productos:", error);
        showModalMain("Error de Sincronización", `No se pudieron cargar los productos en tiempo real. Detalles: ${error.message}`);
    });
}

// Event listeners para el formulario de productos
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productData = {
        name: productNameInput.value,
        description: productDescriptionInput.value,
        code: productCodeInput.value,
        supplier: productSupplierInput.value,
        purchasePrice: parseFloat(productPurchasePriceInput.value),
        salePrice: parseFloat(productSalePriceInput.value),
        quantity: parseInt(productQuantityInput.value),
        location: productLocationInput.value
    };

    if (currentEditingProductId) {
        await updateProduct(currentEditingProductId, productData);
    } else {
        await addProduct(productData);
    }
});

cancelEditButton.addEventListener('click', () => {
    productForm.reset();
    saveProductButton.textContent = 'Añadir Producto';
    cancelEditButton.classList.add('hidden');
    currentEditingProductId = null;
});

searchInput.addEventListener('input', () => {
    listenForProducts(); // Re-render products based on search input
});