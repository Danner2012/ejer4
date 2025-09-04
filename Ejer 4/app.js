const inputLimite = document.getElementById("limite");
const botonGenerar = document.getElementById("generar");
const salida = document.getElementById("salida");
const inputParrafo = document.getElementById("parrafo");
const inputPalabra = document.getElementById("palabra");

// Crea un Worker 
function crearWorker(fn) {
  const blob = new Blob(["onmessage = " + fn.toString()], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

/* Hilo 1 criva de los primoss */
function workerPrimos(e) {
  const n = parseInt(e.data, 10);
  if (!Number.isFinite(n) || n <= 0) {
    postMessage({ ok: false, error: "No negativos" });
    return;
  }

  function estimateUpperBound(k) {
    //
    if (k < 6) return 15;
    const ln = Math.log;
    return Math.ceil(k * (ln(k) + ln(ln(k))));
  }

  function sieveUpTo(limit) {
    // Criba 
    const isPrime = new Uint8Array(limit + 1);
    isPrime.fill(1);
    isPrime[0] = 0; isPrime[1] = 0;
    const root = Math.floor(Math.sqrt(limit));
    for (let p = 2; p <= root; p++) {
      if (isPrime[p]) {
        for (let m = p * p; m <= limit; m += p) isPrime[m] = 0;
      }
    }
    const primes = [];
    for (let i = 2; i <= limit; i++) if (isPrime[i]) primes.push(i);
    return primes;
  }

  // Limites
  let est = estimateUpperBound(n);
  let primes = sieveUpTo(est);
  while (primes.length < n) {
    est = Math.ceil(est * 1.5);
    primes = sieveUpTo(est);
  }

  postMessage({ ok: true, primes: primes.slice(0, n) });
}

/* Hilo2 de las palabras a buscar*/
function workerBusqueda(e) {
  const { parrafo, palabra } = e.data || {};
  if (typeof parrafo !== "string" || typeof palabra !== "string") {
    return;
  }

  const target = palabra.trim().toLowerCase();
  if (!target) {
    return;
  }

  // Pa entrada de cualquier tipo de texto
  const tokens = parrafo
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  // sin dupicados
  const unique = Array.from(new Set(tokens)).sort((a, b) => a.localeCompare(b));

  // Búsqueda binaria
  let left = 0, right = unique.length - 1;
  let found = false;
  while (left <= right) {
    const mid = (left + right) >> 1;
    const cmp = unique[mid].localeCompare(target);
    if (cmp === 0) { found = true; break; }
    if (cmp < 0) left = mid + 1; else right = mid - 1;
  }

  postMessage({ ok: true, exists: found, totalTokens: tokens.length, vocabSize: unique.length });
}

/* Botoness */
botonGenerar.addEventListener("click", () => {
  salida.textContent = "Calculando:\n";

  const limite = parseInt(inputLimite.value, 10);
  const parrafo = inputParrafo.value || "";
  const palabra = inputPalabra.value || "";

  const wPrimos = crearWorker(workerPrimos);
  const wBuscar = crearWorker(workerBusqueda);

  wPrimos.onmessage = (e) => {
    const data = e.data;
    if (!data.ok) {
      salida.textContent += `Error (Primos): ${data.error}\n`;
      return;
    }
    salida.textContent += `Primos (${limite}): ${data.primes.join(", ")}\n`;
  };

  wBuscar.onmessage = (e) => {
    const data = e.data;
    if (!data.ok) {
      salida.textContent += `Error (Búsqueda): ${data.error}\n`;
      return;
    }
    const msg = data.exists ? "EXISTE" : "NO EXISTE";
    salida.textContent += `la palabra "${palabra}" ${msg} en el párrafo. `;
  };

  // Ejecucion de ambos hilos
  wPrimos.postMessage(limite);
  wBuscar.postMessage({ parrafo, palabra });
});
