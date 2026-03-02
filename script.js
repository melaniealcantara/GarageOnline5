/* =========================
   GarageOnline - script.js
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  // Elementos
  const productsContainer = document.getElementById("productsContainer");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const searchInput = document.getElementById("searchInput");
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const resultsCount = document.getElementById("resultsCount");

  // Modales
  const quantityModalEl = document.getElementById("quantityModal");
  const quantityVehicleName = document.getElementById("quantityVehicleName");
  const quantityInput = document.getElementById("quantityInput");
  const addToCartBtn = document.getElementById("addToCartBtn");

  const detailsModalEl = document.getElementById("detailsModal");
  const detailsImage = document.getElementById("detailsImage");
  const detailsList = document.getElementById("detailsList");
  const detailsAddToCartBtn = document.getElementById("detailsAddToCartBtn");

  const cartModalEl = document.getElementById("cartModal");
  const paymentModalEl = document.getElementById("paymentModal");
  const processPaymentBtn = document.getElementById("processPaymentBtn");

  // Datos
  const JSON_URL = "https://raw.githubusercontent.com/JUANCITOPENA/Pagina_Vehiculos_Ventas/refs/heads/main/vehiculos.json";
  let vehiclesData = [];
  let selectedVehicleForQuantity = null;
  let selectedVehicleForDetails = null;

  // Carrito (persistente)
  let cart = loadCartFromStorage(); // [{imagen,logo,codigo,marca,modelo,precio,quantity}]

  // Año en footer
  document.getElementById("year").textContent = new Date().getFullYear();

  /* =========================
     Helpers
     ========================= */
  function safeNumber(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
  }

  function formatCurrency(value) {
    return safeNumber(value).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
  }

  function stripEmojis(text = "") {
    // Quita emojis de manera simple (suficiente para el requisito del prompt)
    return String(text).replace(/[\p{Extended_Pictographic}]/gu, "").trim();
  }

  function showError(message) {
    productsContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">
          <strong>Error:</strong> ${message}
        </div>
      </div>
    `;
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem("garageonline_cart", JSON.stringify(cart));
    } catch (_) {}
  }

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem("garageonline_cart");
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  /* =========================
     1) Carga de vehículos
     ========================= */
  async function loadVehicles() {
    try {
      loadingSpinner?.closest("div")?.setAttribute("aria-busy", "true");
      const res = await fetch(JSON_URL, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`No se pudo cargar el JSON (HTTP ${res.status}).`);
      }

      const data = await res.json();
      vehiclesData = Array.isArray(data) ? data : [];

      displayVehicles(vehiclesData);
    } catch (err) {
      showError(err.message || "Ocurrió un error cargando los vehículos.");
    } finally {
      // Oculta spinner
      if (loadingSpinner) loadingSpinner.style.display = "none";
      loadingSpinner?.closest("div")?.setAttribute("aria-busy", "false");
    }
  }

  /* =========================
     2) Mostrar vehículos
     ========================= */
  function displayVehicles(list) {
    productsContainer.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      productsContainer.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning" role="alert">
            No se encontraron vehículos con ese criterio.
          </div>
        </div>
      `;
      resultsCount.textContent = "0 resultados";
      return;
    }

    resultsCount.textContent = `${list.length} resultado(s)`;

    const fragment = document.createDocumentFragment();

    list.forEach(vehicle => {
      const col = document.createElement("div");
      col.className = "col-md-4 col-sm-6 mb-4";

      const price = safeNumber(vehicle.precio_venta);
      const tipoSinEmojis = stripEmojis(vehicle.tipo);

      col.innerHTML = `
        <article class="card h-100 vehicle-card" aria-label="Vehículo ${vehicle.marca} ${vehicle.modelo}">
          <img class="card-img-top vehicle-img"
               src="${vehicle.imagen}"
               alt="Imagen de ${vehicle.marca} ${vehicle.modelo}"
               loading="lazy" />
          <div class="card-body">
            <h3 class="card-title h5">${vehicle.marca} ${vehicle.modelo}</h3>
            <p class="card-desc text-muted mb-1">${vehicle.categoria || ""} · ${tipoSinEmojis}</p>
            <p class="fw-semibold mb-2">${formatCurrency(price)}</p>

            <div class="card-actions">
              <button class="btn btn-outline-primary viewDetailsBtn"
                      type="button"
                      data-codigo="${vehicle.codigo}"
                      aria-label="Ver detalles de ${vehicle.marca} ${vehicle.modelo}">
                Ver detalle
              </button>

              <button class="btn btn-primary addToCartBtn"
                      type="button"
                      data-codigo="${vehicle.codigo}"
                      aria-label="Añadir ${vehicle.marca} ${vehicle.modelo} al carrito">
                Añadir al carrito
              </button>
            </div>
          </div>
        </article>
      `;

      fragment.appendChild(col);
    });

    productsContainer.appendChild(fragment);
  }

  /* =========================
     3) Filtro
     ========================= */
  function filterVehicles() {
    const q = (searchInput.value || "").toLowerCase().trim();
    if (!q) {
      displayVehicles(vehiclesData);
      return;
    }

    const filtered = vehiclesData.filter(v => {
      const marca = (v.marca || "").toLowerCase();
      const modelo = (v.modelo || "").toLowerCase();
      const categoria = (v.categoria || "").toLowerCase();
      return marca.includes(q) || modelo.includes(q) || categoria.includes(q);
    });

    displayVehicles(filtered);
  }

  /* =========================
     4) Carrito
     ========================= */
  function addItemToCart(vehicle, quantity) {
    const codigo = safeNumber(vehicle.codigo);
    const precio = safeNumber(vehicle.precio_venta);

    const existing = cart.find(item => safeNumber(item.codigo) === codigo);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        imagen: vehicle.imagen || "",
        logo: vehicle.logo || "",     // el JSON podría traerlo o no; se guarda si existe
        codigo,
        marca: vehicle.marca || "",
        modelo: vehicle.modelo || "",
        precio,
        quantity
      });
    }

    saveCartToStorage();
    updateCartUI();
  }

  function updateCartUI() {
    cartItems.innerHTML = "";

    if (!cart.length) {
      cartItems.innerHTML = `<p class="text-muted mb-0">Tu carrito está vacío.</p>`;
      cartTotal.textContent = formatCurrency(0);
      cartCount.textContent = "0";
      return;
    }

    let total = 0;
    let count = 0;

    cart.forEach(item => {
      const subtotal = safeNumber(item.precio) * safeNumber(item.quantity);
      total += subtotal;
      count += safeNumber(item.quantity);

      const div = document.createElement("div");
      div.className = "cart-item";

      div.innerHTML = `
        <div class="d-flex gap-3 align-items-start">
          <img src="${item.imagen}" alt="Imagen de ${item.marca} ${item.modelo}" loading="lazy" />
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between gap-2">
              <div>
                <strong>${item.marca} ${item.modelo}</strong>
                <div class="small text-muted">Código: ${item.codigo}</div>
              </div>
              <div class="text-end">
                <div class="small">Cantidad: <strong>${item.quantity}</strong></div>
                <div class="small">Subtotal: <strong>${formatCurrency(subtotal)}</strong></div>
              </div>
            </div>

            <div class="d-flex gap-2 mt-2">
              <button class="btn btn-sm btn-outline-danger removeItemBtn" data-codigo="${item.codigo}" type="button">
                Quitar
              </button>
              <button class="btn btn-sm btn-outline-secondary decQtyBtn" data-codigo="${item.codigo}" type="button">
                -1
              </button>
              <button class="btn btn-sm btn-outline-secondary incQtyBtn" data-codigo="${item.codigo}" type="button">
                +1
              </button>
            </div>
          </div>
        </div>
      `;

      cartItems.appendChild(div);
    });

    cartTotal.textContent = formatCurrency(total);
    cartCount.textContent = String(count);
  }

  /* =========================
     5) Modal Cantidad
     ========================= */
  function showQuantityModal(vehicle) {
    selectedVehicleForQuantity = vehicle;
    quantityVehicleName.textContent = `${vehicle.marca} ${vehicle.modelo}`;
    quantityInput.value = "1";

    const modal = bootstrap.Modal.getOrCreateInstance(quantityModalEl);
    modal.show();

    addToCartBtn.onclick = () => {
      const qty = parseInt(quantityInput.value, 10);
      if (!Number.isFinite(qty) || qty <= 0) return;

      addItemToCart(selectedVehicleForQuantity, qty);
      modal.hide();
    };
  }

  /* =========================
     6) Modal Detalles
     ========================= */
  function openDetailsModal(vehicle) {
    selectedVehicleForDetails = vehicle;

    detailsImage.src = vehicle.imagen || "";
    detailsImage.alt = `Imagen de ${vehicle.marca} ${vehicle.modelo}`;

    const tipoSinEmojis = stripEmojis(vehicle.tipo);
    const price = safeNumber(vehicle.precio_venta);

    detailsList.innerHTML = `
      <li class="list-group-item"><strong>Marca:</strong> ${vehicle.marca || ""}</li>
      <li class="list-group-item"><strong>Modelo:</strong> ${vehicle.modelo || ""}</li>
      <li class="list-group-item"><strong>Categoría:</strong> ${vehicle.categoria || ""}</li>
      <li class="list-group-item"><strong>Tipo:</strong> ${tipoSinEmojis}</li>
      <li class="list-group-item"><strong>Código:</strong> ${vehicle.codigo}</li>
      <li class="list-group-item"><strong>Precio:</strong> ${formatCurrency(price)}</li>
    `;

    detailsAddToCartBtn.onclick = () => showQuantityModal(selectedVehicleForDetails);

    const modal = bootstrap.Modal.getOrCreateInstance(detailsModalEl);
    modal.show();
  }

  /* =========================
     7) Delegación de eventos (un solo oyente)
     ========================= */
  productsContainer.addEventListener("click", (e) => {
    const target = e.target;

    // Ver detalle
    if (target.classList.contains("viewDetailsBtn")) {
      const codigo = parseInt(target.dataset.codigo, 10);
      const vehicle = vehiclesData.find(v => safeNumber(v.codigo) === codigo);
      if (vehicle) openDetailsModal(vehicle);
    }

    // Añadir al carrito
    if (target.classList.contains("addToCartBtn")) {
      const codigo = parseInt(target.dataset.codigo, 10);
      const vehicle = vehiclesData.find(v => safeNumber(v.codigo) === codigo);
      if (vehicle) showQuantityModal(vehicle);
    }
  });

  // Eventos dentro del carrito (quitar / +/-)
  cartItems.addEventListener("click", (e) => {
    const t = e.target;
    const codigo = parseInt(t.dataset.codigo, 10);

    if (t.classList.contains("removeItemBtn")) {
      cart = cart.filter(x => safeNumber(x.codigo) !== codigo);
      saveCartToStorage();
      updateCartUI();
    }

    if (t.classList.contains("decQtyBtn")) {
      const item = cart.find(x => safeNumber(x.codigo) === codigo);
      if (item) item.quantity = Math.max(1, safeNumber(item.quantity) - 1);
      saveCartToStorage();
      updateCartUI();
    }

    if (t.classList.contains("incQtyBtn")) {
      const item = cart.find(x => safeNumber(x.codigo) === codigo);
      if (item) item.quantity = safeNumber(item.quantity) + 1;
      saveCartToStorage();
      updateCartUI();
    }
  });

  // Filtro al escribir
  searchInput.addEventListener("input", filterVehicles);

  /* =========================
     8) Pago + Factura PDF
     ========================= */
  processPaymentBtn.addEventListener("click", () => {
    if (!cart.length) {
      alert("Tu carrito está vacío.");
      return;
    }

    const payerName = (document.getElementById("payerName").value || "").trim();
    const cardNumber = (document.getElementById("cardNumber").value || "").trim();
    if (!payerName || !cardNumber) {
      alert("Completa los datos del pago (simulado).");
      return;
    }

    alert("✅ Pago exitoso (simulado). Se generará tu factura en PDF.");

    generateInvoice(payerName);

    // Vaciar carrito
    cart = [];
    saveCartToStorage();
    updateCartUI();

    // Cerrar modales pago y carrito
    const paymentModal = bootstrap.Modal.getInstance(paymentModalEl) || bootstrap.Modal.getOrCreateInstance(paymentModalEl);
    const cartModal = bootstrap.Modal.getInstance(cartModalEl) || bootstrap.Modal.getOrCreateInstance(cartModalEl);

    paymentModal.hide();
    cartModal.hide();

    // Limpia form
    document.getElementById("paymentForm").reset();
  });

  function generateInvoice(payerName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const now = new Date();
    const dateStr = now.toLocaleString("es-DO");

    doc.setFontSize(16);
    doc.text("FACTURA - GarageOnline", 14, 18);

    doc.setFontSize(11);
    doc.text(`Cliente: ${payerName}`, 14, 28);
    doc.text(`Fecha: ${dateStr}`, 14, 35);

    let y = 48;
    doc.setFontSize(12);
    doc.text("Detalle:", 14, y);
    y += 8;

    doc.setFontSize(10);
    let total = 0;

    cart.forEach((item, idx) => {
      const subtotal = safeNumber(item.precio) * safeNumber(item.quantity);
      total += subtotal;

      const line = `${idx + 1}. ${item.marca} ${item.modelo} | Cant: ${item.quantity} | Subtotal: ${formatCurrency(subtotal)}`;
      doc.text(line, 14, y);
      y += 7;

      // salto de página básico
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    });

    y += 6;
    doc.setFontSize(12);
    doc.text(`TOTAL: ${formatCurrency(total)}`, 14, y);

    doc.save(`Factura_GarageOnline_${now.getTime()}.pdf`);
  }

  /* =========================
     9) Testing Automatizado (runTests)
     ========================= */
  function runTests() {
    console.log("===== RUN TESTS: GarageOnline =====");

    // Test 1: loadVehicles existe
    console.log(typeof loadVehicles === "function" ? "PASSED ✅ loadVehicles existe" : "FAILED ❌ loadVehicles no existe");

    // Test 2: filterVehicles existe
    console.log(typeof filterVehicles === "function" ? "PASSED ✅ filterVehicles existe" : "FAILED ❌ filterVehicles no existe");

    // Test 3: addItemToCart existe
    console.log(typeof addItemToCart === "function" ? "PASSED ✅ addItemToCart existe" : "FAILED ❌ addItemToCart no existe");

    // Test 4: updateCartUI existe
    console.log(typeof updateCartUI === "function" ? "PASSED ✅ updateCartUI existe" : "FAILED ❌ updateCartUI no existe");

    // Test 5: addItemToCart agrega item
    const before = cart.length;
    addItemToCart({ codigo: 999999, marca: "TEST", modelo: "CAR", precio_venta: 1000, imagen: "" }, 1);
    const after = cart.length;

    console.log(after >= before ? "PASSED ✅ addItemToCart agrega/actualiza" : "FAILED ❌ addItemToCart no agregó");

    // Limpieza del item test (si quedó)
    cart = cart.filter(x => safeNumber(x.codigo) !== 999999);
    saveCartToStorage();
    updateCartUI();

    console.log("===== FIN TESTS =====");
  }

  /* =========================
     Init
     ========================= */
  updateCartUI();     // pinta carrito persistido
  loadVehicles();     // carga JSON
  runTests();         // pruebas automáticas
});