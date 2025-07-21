const http = require('http');
const mysql = require('mysql');

// 1. Configuración de MySQL (XAMPP)
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'proyecto_parcial'
});

// 2. Conectar a MySQL
connection.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        process.exit(1);
    }
    console.log('Conectado a MySQL en XAMPP');

    // Crear tabla si no existe
    connection.query(`
    CREATE TABLE IF NOT EXISTS contactos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      mensaje TEXT NOT NULL,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
        if (err) console.error('Error creando tabla:', err);
        else console.log('Tabla "contactos" lista');
    });
});

// 3. Crear servidor HTTP
const server = http.createServer((req, res) => {
    // Configuración CORS (para comunicación entre Apache y Node.js)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Cuando el navegador no quiere enviar datos todavía
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 4. Manejo de rutas
    //si alguien visita la página principal (/) 
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });//http://localhost:3000
        res.end(JSON.stringify({ mensaje: 'Servidor funcionando' }));
    }
    else if (req.method === 'GET' && req.url === '/api/contacto') {// http://localhost:3000/api/contacto
        connection.query('SELECT * FROM contactos', (err, results) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error al leer datos de la base' }));
                return;
            }
    
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        });
    }
    //recibiendo datos del formulario
    else if (req.method === 'POST' && req.url === '/api/contacto') {
        // Se va juntando toda la información que llega.
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        // Cuando termina de llegar todo, se convierte en un objeto de JavaScript
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('Datos recibidos:', data);

                // Guardar los datos en la base de datos
                connection.query(
                    'INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)',
                    [data.nombre, data.email, data.mensaje],
                    (err, results) => {
                        if (err) {
                            console.error('Error en MySQL:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Error al guardar en DB' }));
                            return;
                        }

                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            mensaje: 'Contacto guardado',
                            id: results.insertId
                        }));
                    }
                );
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Datos inválidos' }));
            }
        });
    }
    // Actualizar un contacto existente (PUT)
    else if (req.method === 'PUT' && req.url.startsWith('/api/contacto/')) {
        const id = req.url.split('/')[3];
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                connection.query(
                    'UPDATE contactos SET nombre = ?, email = ?, mensaje = ? WHERE id = ?',
                    [data.nombre, data.email, data.mensaje, id],
                    (err, results) => {
                        if (err) {
                            console.error('Error en MySQL:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Error al actualizar en DB' }));
                            return;
                        }
                        
                        if (results.affectedRows === 0) {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Contacto no encontrado' }));
                            return;
                        }
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            mensaje: 'Contacto actualizado',
                            id: id
                        }));
                    }
                );
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Datos inválidos' }));
            }
        });
    }
    // Eliminar un contacto (DELETE)
    else if (req.method === 'DELETE' && req.url.startsWith('/api/contacto/')) {
        const id = req.url.split('/')[3];
        
        connection.query(
            'DELETE FROM contactos WHERE id = ?',
            [id],
            (err, results) => {
                if (err) {
                    console.error('Error en MySQL:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Error al eliminar de DB' }));
                    return;
                }
                
                if (results.affectedRows === 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Contacto no encontrado' }));
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    mensaje: 'Contacto eliminado',
                    id: id
                }));
            }
        );
    }
    
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
    }
});

// 5. Iniciar servidor
server.listen(3000, () => {
    console.log('Servidor Node.js en http://localhost:3000');
});