/* =====================================================
   Catálogo de Videojuegos - versión local (sin PHP/MySQL)
   Antes los datos estaban en MySQL y los leía con PHP.
   Como GitHub Pages no ejecuta PHP, ahora los guardo en el
   localStorage del navegador (una pequeña memoria del navegador).
   ===================================================== */

// Nombres con los que guardo cada cosa dentro del localStorage
const CLAVE_JUEGOS = 'catalogo_videojuegos';   // lista de videojuegos
const CLAVE_USUARIOS = 'catalogo_usuarios';    // usuarios registrados
const CLAVE_SESION = 'catalogo_sesion';        // usuario que ha iniciado sesión

// Videojuegos que aparecen la primera vez que se abre la web (antes estaban en la base de datos).
// La imagen es el nombre del archivo que está dentro de la carpeta "imagenes".
const JUEGOS_INICIALES = [
    { id: 1, titulo: 'God of War',          plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'gow2018.jpg',   anio_lanzamiento: 2018 },
    { id: 2, titulo: 'Grand Theft Auto IV', plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'gtaIV.jpg',     anio_lanzamiento: 2008 },
    { id: 3, titulo: 'Grand Theft Auto VI', plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'gtaVI.jpg',     anio_lanzamiento: 2026 },
    { id: 4, titulo: 'Sonic the Hedgehog',  plataforma: 'Sega Mega Drive', genero: 'Aventura', imagen: 'sonic.jpg',     anio_lanzamiento: 1991 },
    { id: 5, titulo: 'El Padrino',          plataforma: 'PlayStation',     genero: 'Acción',   imagen: 'elpadrino.jpg', anio_lanzamiento: 2006 },
    { id: 6, titulo: 'FIFA 13',             plataforma: 'PlayStation',     genero: 'Deportes', imagen: 'fifa13.jpg',    anio_lanzamiento: 2012 }
];

/* ---------- Utilidades de almacenamiento ---------- */

// Lee algo del localStorage. Si no existe o falla, devuelve el valor por defecto.
function leer(clave, porDefecto) {
    try {
        const v = localStorage.getItem(clave);
        return v ? JSON.parse(v) : porDefecto;   // el localStorage guarda texto, lo convierto a objeto
    } catch (e) {
        return porDefecto;
    }
}

// Guarda algo en el localStorage (convirtiéndolo a texto). Devuelve true si ha ido bien.
function guardar(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
    } catch (e) {
        return false;   // por ejemplo, si el almacenamiento está lleno
    }
}

// Cambia los caracteres especiales (< > & " ') para que un texto no pueda inyectar HTML.
// Es el equivalente a htmlspecialchars() de PHP.
function escapar(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ---------- Videojuegos ---------- */

// Devuelve la lista de videojuegos. La primera vez guarda los de ejemplo.
// (Equivale al SELECT * FROM videojuegos de antes)
function obtenerJuegos() {
    let juegos = leer(CLAVE_JUEGOS, null);
    if (!juegos) {
        juegos = JUEGOS_INICIALES;
        guardar(CLAVE_JUEGOS, juegos);
    }
    return juegos;
}

// Guarda la lista completa de videojuegos. Si no cabe, avisa con un mensaje.
function guardarJuegos(juegos) {
    if (!guardar(CLAVE_JUEGOS, juegos)) {
        alert('Error al guardar: el almacenamiento del navegador está lleno.');
        return false;
    }
    return true;
}

// Calcula de dónde se carga la imagen: si es una imagen subida por mí (empieza por "data:")
// la uso tal cual, y si es una de la carpeta "imagenes" le añado la ruta.
function rutaImagen(imagen) {
    return imagen.startsWith('data:') ? imagen : 'imagenes/' + imagen;
}

/* Reduce la imagen subida para que quepa en el localStorage */
function procesarImagen(archivo) {
    // Devuelvo una promesa porque leer y cargar la imagen lleva un tiempo
    return new Promise((resolver, rechazar) => {
        const lector = new FileReader();   // lee el archivo que elige el usuario
        lector.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
        lector.onload = () => {
            const img = new Image();
            img.onerror = () => rechazar(new Error('Imagen no válida'));
            img.onload = () => {
                // Reduzco la imagen a 600px de ancho como máximo (si ya es más pequeña, no la toco)
                const maximo = 600;
                const escala = Math.min(1, maximo / img.width);
                // Dibujo la imagen en un canvas del tamaño nuevo...
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * escala);
                canvas.height = Math.round(img.height * escala);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                // ...y la convierto a texto (JPG con calidad 0.8) para poder guardarla
                resolver(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = lector.result;
        };
        lector.readAsDataURL(archivo);   // empieza a leer el archivo
    });
}

/* ---------- Usuarios y sesión ---------- */

// Convierte la contraseña en un código (hash SHA-256) para no guardarla en texto normal.
// Es el equivalente a password_hash() de PHP.
async function hashPassword(password) {
    if (window.crypto && crypto.subtle) {
        const datos = new TextEncoder().encode(password);
        const buffer = await crypto.subtle.digest('SHA-256', datos);
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Si el navegador no tiene crypto, uso un método más simple
    return btoa(unescape(encodeURIComponent(password)));
}

// Devuelve el usuario que ha iniciado sesión (o null si no hay nadie).
// Es el equivalente a $_SESSION de PHP.
function obtenerSesion() {
    return leer(CLAVE_SESION, null);
}

/* ---------- Cabecera (antes cabeza.php) ---------- */

// Dibuja el menú de arriba en todas las páginas. Antes lo hacía cabeza.php.
function pintarCabecera() {
    const menu = document.getElementById('menu');
    if (!menu) return;   // si la página no tiene menú, no hago nada
    const sesion = obtenerSesion();

    // Si hay sesión iniciada muestro "Hola, nombre" y "Cerrar Sesión";
    // si no, muestro "Crear Usuario" e "Iniciar Sesión"
    const enlaces = sesion
        ? '<span class="bienvenida-nav">Hola, ' + escapar(sesion.nombre) + '</span>' +
          '<a class="boton" href="#" id="btn-logout">Cerrar Sesión</a>'
        : '<a class="boton" href="register.html">Crear Usuario</a>' +
          '<a class="boton" href="login.html">Iniciar Sesión</a>';

    // Escribo dentro del menú: el título, el botón hamburguesa (solo se ve en móvil y tablet)
    // y los enlaces de arriba
    menu.innerHTML =
        '<h2>Catálogo de Videojuegos</h2>' +
        '<button type="button" class="hamburguesa" id="btn-menu" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu-enlaces">' +
        '<span></span><span></span><span></span></button>' +
        '<div class="menu-enlaces" id="menu-enlaces">' + enlaces + '</div>';

    // Abrir y cerrar el menú en móvil
    const boton = document.getElementById('btn-menu');
    // Abre o cierra el menú. Si no le digo nada, hace lo contrario de lo que está ahora.
    // Para abrirlo añado la clase "abierto" al menú, y el CSS se encarga de mostrarlo.
    function alternar(abrir) {
        const abierto = abrir ?? !menu.classList.contains('abierto');
        menu.classList.toggle('abierto', abierto);
        // Estos atributos son para lectores de pantalla (accesibilidad)
        boton.setAttribute('aria-expanded', abierto);
        boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    }
    // Al pulsar el botón hamburguesa, abro o cierro
    boton.addEventListener('click', () => alternar());
    // Con la tecla Escape lo cierro
    document.addEventListener('keydown', e => { if (e.key === 'Escape') alternar(false); });
    // Si pulso fuera del menú, lo cierro
    document.addEventListener('click', e => { if (!menu.contains(e.target)) alternar(false); });
    // Si la pantalla pasa a tamaño de ordenador, lo cierro para que no se quede abierto
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) alternar(false); });

    // Cerrar sesión: borro la sesión guardada y vuelvo al inicio (antes lo hacía logout.php)
    if (sesion) {
        document.getElementById('btn-logout').addEventListener('click', e => {
            e.preventDefault();   // evito que el enlace "#" haga otra cosa
            localStorage.removeItem(CLAVE_SESION);
            window.location.href = 'index.html';
        });
    }
}

/* ---------- Página: index ---------- */

// Página principal: muestra todos los videojuegos en tarjetas (antes lo hacía index.php con un foreach)
function iniciarIndex() {
    const lista = document.getElementById('lista');

    // Dibuja una tarjeta por cada videojuego
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

    // Cuando pulso "Eliminar" en una tarjeta: quito ese juego de la lista y la vuelvo a dibujar.
    // (Escucho los clics en toda la lista porque las tarjetas se crean desde JavaScript)
    lista.addEventListener('click', e => {
        const enlace = e.target.closest('[data-eliminar]');
        if (!enlace) return;   // si no he pulsado en "Eliminar", no hago nada
        e.preventDefault();
        const id = Number(enlace.dataset.eliminar);
        // Me quedo con todos los juegos menos el que tiene ese id (antes: DELETE ... WHERE id = :id)
        if (guardarJuegos(obtenerJuegos().filter(j => j.id !== id))) pintar();
    });

    pintar();   // dibujo las tarjetas al cargar la página
}

/* ---------- Página: nuevo ---------- */

// Formulario para añadir un videojuego (antes: nuevo.php + crear.php)
function iniciarNuevo() {
    const form = document.getElementById('form-nuevo');
    const mensaje = document.getElementById('mensaje');

    // Al enviar el formulario...
    form.addEventListener('submit', async e => {
        e.preventDefault();   // evito que la página se recargue
        mensaje.textContent = '';
        const datos = new FormData(form);   // recojo todo lo que hay escrito en el formulario

        try {
            // Reduzco la carátula elegida y la convierto a texto
            const imagen = await procesarImagen(datos.get('imagen'));
            const juegos = obtenerJuegos();
            // El id nuevo es el id más alto que hay + 1 (antes lo hacía MySQL con AUTO_INCREMENT)
            const nuevoId = juegos.reduce((max, j) => Math.max(max, j.id), 0) + 1;

            // Añado el videojuego nuevo a la lista (antes: INSERT INTO videojuegos ...)
            juegos.push({
                id: nuevoId,
                titulo: datos.get('titulo'),
                plataforma: datos.get('plataforma'),
                genero: datos.get('genero'),
                imagen: imagen,
                anio_lanzamiento: Number(datos.get('anio_lanzamiento'))
            });

            // Guardo y vuelvo a la página principal
            if (guardarJuegos(juegos)) window.location.href = 'index.html';
        } catch (err) {
            mensaje.textContent = 'Error al procesar la imagen.';
        }
    });
}

/* ---------- Página: editar ---------- */

// Formulario para modificar un videojuego (antes: editar.php + guardar.php)
function iniciarEditar() {
    const form = document.getElementById('form-editar');
    const mensaje = document.getElementById('mensaje');
    // Saco el id de la dirección (editar.html?id=3) para saber qué juego edito
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    const juegos = obtenerJuegos();
    const juego = juegos.find(j => j.id === id);

    // Si ese juego no existe, vuelvo a la página principal
    if (!juego) {
        window.location.href = 'index.html';
        return;
    }

    // Relleno el formulario con los datos actuales del juego
    form.titulo.value = juego.titulo;
    form.plataforma.value = juego.plataforma;
    form.genero.value = juego.genero;
    form.anio_lanzamiento.value = juego.anio_lanzamiento;

    // Al enviar el formulario...
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
            // Actualizo los datos del juego (antes: UPDATE videojuegos SET ...)
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

// Registro de usuarios (antes: register.php + registrar.php)
function iniciarRegistro() {
    const form = document.getElementById('form-registro');
    const mensaje = document.getElementById('mensaje');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensaje.textContent = '';
        const datos = new FormData(form);
        // Guardo el correo en minúsculas y sin espacios para que no haya duplicados por error
        const correo = datos.get('correo').trim().toLowerCase();
        const usuarios = leer(CLAVE_USUARIOS, []);

        // Si ya hay un usuario con ese correo, muestro el error y paro
        if (usuarios.some(u => u.correo === correo)) {
            mensaje.textContent = 'Error al registrar. Es posible que el correo ya esté en uso.';
            return;
        }

        // Añado el usuario nuevo, con la contraseña convertida en hash
        usuarios.push({
            nombre: datos.get('nombre'),
            correo: correo,
            password: await hashPassword(datos.get('password'))
        });

        // Guardo y paso a la página de login
        if (guardar(CLAVE_USUARIOS, usuarios)) {
            window.location.href = 'login.html';
        } else {
            mensaje.textContent = 'Error al registrar.';
        }
    });
}

/* ---------- Página: login ---------- */

// Inicio de sesión (antes: login.php + logear.php)
function iniciarLogin() {
    const form = document.getElementById('form-login');
    const mensaje = document.getElementById('mensaje');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensaje.textContent = '';
        const datos = new FormData(form);
        const correo = datos.get('correo').trim().toLowerCase();
        // Convierto la contraseña escrita en hash para compararla con la que guardé al registrarme
        const hash = await hashPassword(datos.get('password'));
        // Busco un usuario con ese correo y esa contraseña (antes: password_verify)
        const usuario = leer(CLAVE_USUARIOS, []).find(u => u.correo === correo && u.password === hash);

        if (usuario) {
            // Guardo la sesión (nombre y correo) y voy a la página principal
            guardar(CLAVE_SESION, { correo: usuario.correo, nombre: usuario.nombre });
            window.location.href = 'index.html';
        } else {
            mensaje.textContent = 'Correo o contraseña incorrectos.';
        }
    });
}

/* ---------- Arranque ---------- */

// Cuando la página termina de cargar: dibujo el menú de arriba y arranco
// la parte que corresponde a esa página (cada HTML dice cuál es en <body data-pagina="...">)
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
    if (iniciar) iniciar();   // si la página tiene función propia, la ejecuto
});
