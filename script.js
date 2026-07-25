// ==========================================
// MOVE — CLASE DE PRUEBA
// MOVE Dance Academy
// ==========================================

const WORKER_URL = "https://portalalumnas.movedancea.workers.dev";

// Esta misma página se usa en dos lugares: la web pública (donde
// avisamos que la academia se va a comunicar para confirmar) y el
// botón de Recepción (donde el mensaje puede ser de confirmación
// directa, porque ahí sí es seguro que la fecha elegida se respeta).
// Lo distinguimos con data-origen="recepcion" en el <body>.
const ORIGEN = document.body.dataset.origen === "recepcion" ? "recepcion" : "web";

// Orden en el que queremos mostrar los estilos en el selector (si
// aparece un estilo nuevo que no está en esta lista, se agrega al
// final, ordenado alfabéticamente, para que nunca se pierda).
const ORDEN_ESTILOS = [
  "PRE DANZA",
  "JAZZ",
  "BALLET",
  "CONTEMPORANEO",
  "BALLROOM",
  "URBANOS",
  "ACRO",
  "SALSA",
  "BACHATA",
];

let clasesDisponibles = [];
let opcionesHoraActuales = [];
let diasPermitidosActuales = [];

const NOMBRES_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function el(id) {
  return document.getElementById(id);
}

function textoDiasPermitidos(dias) {
  const nombres = [...dias].sort((a, b) => a - b).map((d) => NOMBRES_DIAS[d]);
  if (nombres.length === 1) return `los ${nombres[0]}`;
  if (nombres.length === 2) return `los ${nombres[0]} y ${nombres[1]}`;
  return `los ${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

// ---------- selector de edad / precios ----------

document.querySelectorAll(".chip-edad").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip-edad").forEach((b) => b.classList.remove("activa"));
    btn.classList.add("activa");
    el("imagenPrecios").src = btn.dataset.img + ".png";
  });
});

// ---------- selectores de clase / hora (en vivo desde Airtable) ----------

async function cargarClasesDisponibles() {
  const selectClase = el("selectClase");
  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "horariosDisponibles" }),
    });
    const datos = await res.json();
    if (!datos.success) throw new Error(datos.error || "No se pudieron cargar las clases.");

    clasesDisponibles = datos.clases || [];

    const estilos = [...new Set(clasesDisponibles.map((c) => c.estilo))];
    estilos.sort((a, b) => {
      const ia = ORDEN_ESTILOS.indexOf(a);
      const ib = ORDEN_ESTILOS.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    selectClase.innerHTML = '<option value="" disabled selected>Elige una clase</option>';
    estilos.forEach((estilo) => {
      const opt = document.createElement("option");
      opt.value = estilo;
      opt.textContent = capitalizarEstilo(estilo);
      selectClase.appendChild(opt);
    });
  } catch (e) {
    selectClase.innerHTML = '<option value="" disabled selected>No se pudieron cargar las clases</option>';
    mostrarErrorPrueba("No se pudieron cargar las clases disponibles. Actualiza la página e intenta de nuevo.");
  }
}

function capitalizarEstilo(texto) {
  return (texto || "")
    .toLowerCase()
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

el("selectClase").addEventListener("change", (e) => {
  const estilo = e.target.value;
  const selectHora = el("selectHora");

  opcionesHoraActuales = clasesDisponibles.filter((c) => c.estilo === estilo);
  diasPermitidosActuales = [];
  mostrarAyudaFecha("");
  mostrarErrorPrueba("");

  if (!opcionesHoraActuales.length) {
    selectHora.innerHTML = '<option value="" disabled selected>No hay horarios disponibles</option>';
    selectHora.disabled = true;
    return;
  }

  selectHora.innerHTML = '<option value="" disabled selected>Elige un horario</option>';
  opcionesHoraActuales.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${c.grupo} — ${c.horarios.map((h) => h.texto).join(" y ")}`;
    selectHora.appendChild(opt);
  });
  selectHora.disabled = false;
});

el("selectHora").addEventListener("change", (e) => {
  mostrarErrorPrueba("");
  const opcion = opcionesHoraActuales[Number(e.target.value)];
  if (!opcion) {
    diasPermitidosActuales = [];
    mostrarAyudaFecha("");
    return;
  }
  diasPermitidosActuales = [...new Set(opcion.horarios.flatMap((h) => h.dias))];
  if (diasPermitidosActuales.length) {
    mostrarAyudaFecha(`📅 Esta clase se imparte ${textoDiasPermitidos(diasPermitidosActuales)}. Elige una fecha en uno de esos días.`);
  } else {
    mostrarAyudaFecha("");
  }
  validarFechaSeleccionada();
});

function mostrarAyudaFecha(msg) {
  el("ayudaFecha").textContent = msg || "";
}

function validarFechaSeleccionada() {
  const fecha = el("inputFecha").value;
  if (!fecha || !diasPermitidosActuales.length) return true;
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  if (!diasPermitidosActuales.includes(diaSemana)) {
    mostrarErrorPrueba(`Esa fecha no es válida para esta clase. Recuerda que se imparte ${textoDiasPermitidos(diasPermitidosActuales)}.`);
    return false;
  }
  mostrarErrorPrueba("");
  return true;
}

el("inputFecha").addEventListener("change", validarFechaSeleccionada);

// ---------- envío del formulario ----------

function mostrarErrorPrueba(msg) {
  el("mensajeErrorPrueba").textContent = msg || "";
}

el("formPrueba").addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarErrorPrueba("");

  const alumna = el("inputAlumna").value.trim();
  const edad = el("inputEdad").value.trim();
  const telefono = el("inputTelefono").value.trim();
  const fecha = el("inputFecha").value;
  const indiceHora = el("selectHora").value;

  if (!alumna || !edad || !telefono || !fecha || indiceHora === "") {
    mostrarErrorPrueba("Completa todos los campos para agendar tu clase.");
    return;
  }

  const opcion = opcionesHoraActuales[Number(indiceHora)];
  if (!opcion) {
    mostrarErrorPrueba("Elige una clase y un horario válidos.");
    return;
  }

  if (!validarFechaSeleccionada()) {
    return;
  }

  const btn = el("btnReservar");
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = "Agendando...";

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "agendarPrueba",
        alumna,
        edad,
        telefono,
        fecha,
        clase: opcion.grupo,
        hora: opcion.horarios.map((h) => h.texto).join(" y "),
        origen: ORIGEN,
      }),
    });
    const datos = await res.json();
    if (!datos.success) throw new Error(datos.error || "No se pudo agendar tu clase de prueba.");

    el("formPrueba").hidden = true;
    el("tarjetaExito").hidden = false;
  } catch (err) {
    mostrarErrorPrueba(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});

el("btnAgendarOtra").addEventListener("click", () => {
  el("formPrueba").reset();
  el("formPrueba").hidden = false;
  el("tarjetaExito").hidden = true;
  el("selectHora").innerHTML = '<option value="" disabled selected>Primero elige una clase</option>';
  el("selectHora").disabled = true;
  diasPermitidosActuales = [];
  mostrarAyudaFecha("");
  mostrarErrorPrueba("");
});

// ---------- arranque ----------
cargarClasesDisponibles();
