// --- IndexedDB setup ---
let db;
const request = indexedDB.open("RecetasDB", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  const store = db.createObjectStore("recetas", { keyPath: "id", autoIncrement: true });
  store.createIndex("categoria", "categoria", { unique: false });
  store.createIndex("favorito", "favorito", { unique: false });
};

request.onsuccess = function (e) {
  db = e.target.result;
  mostrarRecetas();
};

request.onerror = function () {
  console.error("Error al abrir IndexedDB");
};

// --- Guardar / Editar receta ---
const form = document.getElementById("recipeForm");
form.addEventListener("submit", guardarReceta);

function guardarReceta(e) {
  e.preventDefault();
  const id = document.getElementById("recipeId").value;
  const name = document.getElementById("name").value.trim();
  const category = document.getElementById("category").value.trim();
  const ingredients = document.getElementById("ingredients").value.trim();
  const instructions = document.getElementById("instructions").value.trim();
  const imageInput = document.getElementById("image");

  if (!name) return alert("Por favor, escribe un nombre de receta.");

  const reader = new FileReader();
  reader.onload = function (event) {
    const receta = {
      id: id ? Number(id) : undefined,
      nombre: name,
      categoria: category || "Sin categoría",
      ingredientes: ingredients,
      instrucciones: instructions,
      imagen: event.target.result || "",
      favorito: false
    };

    const tx = db.transaction("recetas", "readwrite");
    const store = tx.objectStore("recetas");
    id ? store.put(receta) : store.add(receta);
    tx.oncomplete = () => {
      form.reset();
      document.getElementById("recipeId").value = "";
      mostrarRecetas();
    };
  };

  if (imageInput.files.length > 0) reader.readAsDataURL(imageInput.files[0]);
  else reader.onload({ target: { result: "" } });
}

// --- Mostrar recetas ---
const lista = document.getElementById("recipeList");
const search = document.getElementById("search");
const filter = document.getElementById("filterCategory");
const favBtn = document.getElementById("showFavorites");
let mostrarSoloFavoritos = false;

search.addEventListener("input", mostrarRecetas);
filter.addEventListener("change", mostrarRecetas);
favBtn.addEventListener("click", () => {
  mostrarSoloFavoritos = !mostrarSoloFavoritos;
  favBtn.classList.toggle("active", mostrarSoloFavoritos);
  mostrarRecetas();
});

function mostrarRecetas() {
  const tx = db.transaction("recetas", "readonly");
  const store = tx.objectStore("recetas");
  const req = store.getAll();
  req.onsuccess = function () {
    const term = search.value.toLowerCase();
    const cat = filter.value;
    const recetas = req.result.filter(r =>
      (!term || r.nombre.toLowerCase().includes(term)) &&
      (!cat || r.categoria === cat) &&
      (!mostrarSoloFavoritos || r.favorito)
    );

    lista.innerHTML = recetas.length
      ? recetas.map(r => `
        <div class="recipe-card">
          ${r.imagen ? `<img src="${r.imagen}" alt="${r.nombre}">` : ""}
          <h3>${r.nombre}</h3>
          <p><strong>Categoría:</strong> ${r.categoria}</p>
          <p>${r.ingredientes}</p>
          <p>${r.instrucciones}</p>
          <div class="card-actions">
            <span class="favorite" data-id="${r.id}">${r.favorito ? "⭐" : "☆"}</span>
            <button onclick="editarReceta(${r.id})">✏️</button>
            <button onclick="eliminarReceta(${r.id})">🗑️</button>
          </div>
        </div>
      `).join("")
      : `<p style="text-align:center;">No hay recetas aún.</p>`;

    actualizarCategorias(req.result);
    document.querySelectorAll(".favorite").forEach(f =>
      f.addEventListener("click", toggleFavorito)
    );
  };
}

// --- Favoritos ---
function toggleFavorito(e) {
  const id = Number(e.target.dataset.id);
  const tx = db.transaction("recetas", "readwrite");
  const store = tx.objectStore("recetas");
  const req = store.get(id);
  req.onsuccess = function () {
    const receta = req.result;
    receta.favorito = !receta.favorito;
    store.put(receta);
    mostrarRecetas();
  };
}

// --- Editar / Eliminar ---
function editarReceta(id) {
  const tx = db.transaction("recetas", "readonly");
  const store = tx.objectStore("recetas");
  const req = store.get(id);
  req.onsuccess = function () {
    const r = req.result;
    document.getElementById("recipeId").value = r.id;
    document.getElementById("name").value = r.nombre;
    document.getElementById("category").value = r.categoria;
    document.getElementById("ingredients").value = r.ingredientes;
    document.getElementById("instructions").value = r.instrucciones;
  };
}

function eliminarReceta(id) {
  if (!confirm("¿Eliminar esta receta?")) return;
  const tx = db.transaction("recetas", "readwrite");
  const store = tx.objectStore("recetas");
  store.delete(id);
  tx.oncomplete = mostrarRecetas;
}

// --- Categorías dinámicas ---
function actualizarCategorias(recetas) {
  const categorias = [...new Set(recetas.map(r => r.categoria).filter(Boolean))];
  filter.innerHTML = `<option value="">Todas las categorías</option>` +
    categorias.map(c => `<option value="${c}">${c}</option>`).join("");
}

// --- Exportar / Importar ---
document.getElementById("exportBtn").addEventListener("click", exportarRecetas);
document.getElementById("importFile").addEventListener("change", importarRecetas);

function exportarRecetas() {
  const tx = db.transaction("recetas", "readonly");
  const store = tx.objectStore("recetas");
  const req = store.getAll();
  req.onsuccess = function () {
    const data = JSON.stringify(req.result, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recetas.json";
    a.click();
    URL.revokeObjectURL(url);
  };
}

function importarRecetas(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    const recetas = JSON.parse(event.target.result);
    const tx = db.transaction("recetas", "readwrite");
    const store = tx.objectStore("recetas");
    recetas.forEach(r => store.put(r));
    tx.oncomplete = mostrarRecetas;
  };
  reader.readAsText(file);
}
