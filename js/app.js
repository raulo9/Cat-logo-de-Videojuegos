/* =====================================================
   Catálogo de Videojuegos - versión local (sin PHP/MySQL)
   Los datos se guardan en el localStorage del navegador.
   ===================================================== */

const CLAVE_JUEGOS = 'catalogo_videojuegos';
const CLAVE_USUARIOS = 'catalogo_usuarios';
const CLAVE_SESION = 'catalogo_sesion';

const JUEGOS_INICIALES = [
    { id: 1, titulo: 'God of War',          plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'gow2018.jpg',   anio_lanzamiento: 2018 },
    { id: 2, titulo: 'Grand Theft Auto IV', plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'gtaIV.jpg',     anio_lanzamiento: 2008 },
    { id: 3, titulo: 'Grand Theft Auto VI', plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'gtaVI.jpg',     anio_lanzamiento: 2026 },
    { id: 4, titulo: 'Sonic the Hedgehog',  plataforma: 'Sega Mega Drive', genero: 'Aventura', imagen: 'sonic.jpg',     anio_lanzamiento: 1991 },
    { id: 5, titulo: 'El Padrino',          plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'elpadrino.jpg', anio_lanzamiento: 2006 },
    { id: 6, titulo: 'FIFA 13',             plataforma: 'PlayStation',     genero: 'Deportes', imagen: 'fifa13.jpg',    anio_lanzamiento: 2012 }
];

/* ---------- Utilidades de almacenamiento ---------- */

function leer(clave, porDefecto) {
    try {
        const v = localStorage.getItem(clave);
        return v ? JSON.parse(v) : porDefecto;
    } catch (e) {
        return porDefecto;
    }
}

function guardar(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
    } catch (e) {
        return false;
    }
}

function escapar(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ---------- Videojuegos ---------- */

function obtenerJuegos() {
    let juegos = leer(CLAVE_JUEGOS, null);
    if (!juegos) {
        juegos = JUEGOS_INICIALES;
        guardar(CLAVE_JUEGOS, juegos);
    }
    return juegos;
}

function guardarJuegos(juegos) {
    if (!guardar(CLAVE_JUEGOS, juegos)) {
        alert('Error al guardar: el almacenamiento del navegador está lleno.');
        return false;
    }
    return true;
}

function rutaImagen(imagen) {
    return imagen.startsWith('data:') ? imagen : 'imagenes/' + imagen;
}

/* Reduce la imagen subida para que quepa en el localStorage */
function procesarImagen(archivo) {
    return new Promise((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
        lector.onload = () => {
            const img = new Image();
            img.onerror = () => rechazar(new Error('Imagen no válida'));
            img.onload = () => {
                const maximo = 600;
                const escala = Math.min(1, maximo / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * escala);
                canvas.height = Math.round(img.height * escala);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolver(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = lector.result;
        };
        lector.readAsDataURL(archivo);
    });
}

/* ---------- Usuarios y sesión ---------- */

async function hashPassword(password) {
    if (window.crypto && crypto.subtle) {
        const datos = new TextEncoder().encode(password);
        const buffer = await crypto.subtle.digest('SHA-256', datos);
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return btoa(unescape(encodeURIComponent(password)));
}

function obtenerSesion() {
    return leer(CLAVE_SESION, null);
}

/* ---------- Cabecera (antes cabeza.php) ---------- */

function pintarCabecera() {
    const menu = document.getElementById('menu');
    if (!menu) return;
    const sesion = obtenerSesion();

    if (sesion) {
        menu.innerHTML =
            '<h2>Catálogo de Videojuegos</h2>' +
            '<div class="menu-enlaces">' +
            '<span class="bienvenida-nav">Hola, ' + escapar(sesion.nombre) + '</span>' +
            '<a class="boton" href="#" id="btn-logout">Cerrar Sesión</a>' +
            '</div>';
        document.getElementById('btn-logout').addEventListener('click', e => {
            e.preventDefault();
            localStorage.removeItem(CLAVE_SESION);
            window.location.href = 'index.html';
        });
    } else {
        menu.innerHTML =
            '<h2>Catálogo de Videojuegos</h2>' +
            '<div class="menu-enlaces">' +
            '<a class="boton" href="register.html">Crear Usuario</a>' +
            '<a class="boton" href="login.html">Iniciar Sesión</a>' +
            '</div>';
    }
}

/* ---------- Página: index ---------- */

function iniciarIndex() {
    const lista = document.getElementById('lista');

    function pintar() {
        lista.innerHTML = obtenerJuegos().map(j => `
<div class="persona">
    <p class="titulo-juego"><strong>${escapar(j.titulo)}</strong></p>
    ${j.imagen ? `<img class="imagen-juego" src="${escapar(rutaImagen(j.imagen))}" alt="Carátula de ${escapar(j.titulo)}">` : ''}
    <div class="detalles-juego">
        <p>Plataforma: ${escapar(j.plataforma)}</p>
        <p>Género: ${escapar(j.genero)}</p>
        <p>Año: ${escapar(j.anio_lanzamiento)}</p>
    </div>
    <div class="acciones-juego">
        <a class="boton" href="editar.html?id=${j.id}">Editar</a>
        <a class="boton" href="#" data-eliminar="${j.id}">Eliminar</a>
    </div>
</div>`).join('');
    }

    lista.addEventListener('click', e => {
        const enlace = e.target.closest('[data-eliminar]');
        if (!enlace) return;
        e.preventDefault();
        const id = Number(enlace.dataset.eliminar);
        if (guardarJuegos(obtenerJuegos().filter(j => j.id !== id))) pintar();
    });

    pintar();
}

/* ---------- Página: nuevo ---------- */

function iniciarNuevo() {
    const form = document.getElementById('form-nuevo');
    const mensaje = document.getElementById('mensaje');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensaje.textContent = '';
        const datos = new FormData(form);

        try {
            const imagen = await procesarImagen(datos.get('imagen'));
            const juegos = obtenerJuegos();
            const nuevoId = juegos.reduce((max, j) => Math.max(max, j.id), 0) + 1;

            juegos.push({
                id: nuevoId,
                titulo: datos.get('titulo'),
                plataforma: datos.get('plataforma'),
                genero: datos.get('genero'),
                imagen: imagen,
                anio_lanzamiento: Number(datos.get('anio_lanzamiento'))
            });

            if (guardarJuegos(juegos)) window.location.href = 'index.html';
        } catch (err) {
            mensaje.textContent = 'Error al procesar la imagen.';
        }
    });
}

/* ---------- Página: editar ---------- */

function iniciarEditar() {
    const form = document.getElementById('form-editar');
    const mensaje = document.getElementById('mensaje');
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    const juegos = obtenerJuegos();
    const juego = juegos.find(j => j.id === id);

    if (!juego) {
        window.location.href = 'index.html';
        return;
    }

    form.titulo.value = juego.titulo;
    form.plataforma.value = juego.plataforma;
    form.genero.value = juego.genero;
    form.anio_lanzamiento.value = juego.anio_lanzamiento;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensaje.textContent = '';
        const datos = new FormData(form);
        const archivo = datos.get('imagen');

        try {
            // Si no se elige archivo nuevo, se mantiene la carátula actual
            if (archivo && archivo.name) {
                juego.imagen = await procesarImagen(archivo);
            }
            juego.titulo = datos.get('titulo');
            juego.plataforma = datos.get('plataforma');
            juego.genero = datos.get('genero');
            juego.anio_lanzamiento = Number(datos.get('anio_lanzamiento'));

            if (guardarJuegos(juegos)) window.location.href = 'index.html';
        } catch (err) {
            mensaje.textContent = 'Error al procesar la imagen.';
        }
    });
}

/* ---------- Página: register ---------- */

function iniciarRegistro() {
    const form = document.getElementById('form-registro');
    const mensaje = document.getElementById('mensaje');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensaje.textContent = '';
        const datos = new FormData(form);
        const correo = datos.get('correo').trim().toLowerCase();
        const usuarios = leer(CLAVE_USUARIOS, []);

        if (usuarios.some(u => u.correo === correo)) {
            mensaje.textContent = 'Error al registrar. Es posible que el correo ya esté en uso.';
            return;
        }

        usuarios.push({
            nombre: datos.get('nombre'),
            correo: correo,
            password: await hashPassword(datos.get('password'))
        });

        if (guardar(CLAVE_USUARIOS, usuarios)) {
            window.location.href = 'login.html';
        } else {
            mensaje.textContent = 'Error al registrar.';
        }
    });
}

/* ---------- Página: login ---------- */

function iniciarLogin() {
    const form = document.getElementById('form-login');
    const mensaje = document.getElementById('mensaje');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensaje.textContent = '';
        const datos = new FormData(form);
        const correo = datos.get('correo').trim().toLowerCase();
        const hash = await hashPassword(datos.get('password'));
        const usuario = leer(CLAVE_USUARIOS, []).find(u => u.correo === correo && u.password === hash);

        if (usuario) {
            guardar(CLAVE_SESION, { correo: usuario.correo, nombre: usuario.nombre });
            window.location.href = 'index.html';
        } else {
            mensaje.textContent = 'Correo o contraseña incorrectos.';
        }
    });
}

/* ---------- Arranque ---------- */

document.addEventListener('DOMContentLoaded', () => {
    pintarCabecera();
    const paginas = {
        index: iniciarIndex,
        nuevo: iniciarNuevo,
        editar: iniciarEditar,
        register: iniciarRegistro,
        login: iniciarLogin
    };
    const iniciar = paginas[document.body.dataset.pagina];
    if (iniciar) iniciar();
});
