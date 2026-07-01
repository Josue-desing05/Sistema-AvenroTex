const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'hola',
    password: process.env.DB_PASS || '123456',
    server: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'DB_Planilla_Avenrotex',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function main() {
    try {
        await sql.connect(dbConfig);
        console.log("Connected to DB.");

        console.log("Cleaning old assistance records for Luis Carlos...");
        await sql.query`DELETE FROM ASISTENCIAS WHERE id_trabajador = 1`;

        console.log("Inserting attendance data for worker ID 1...");
        await sql.query`
            INSERT INTO ASISTENCIAS (id_trabajador, fecha, hora_entrada, hora_salida, minutos_tardanza)
            VALUES (1, '2026-06-15', '2026-06-15 08:00:00', '2026-06-15 17:00:00', 0),
                   (1, '2026-06-16', '2026-06-16 08:00:00', '2026-06-16 17:00:00', 0),
                   (1, '2026-06-17', '2026-06-17 08:00:00', '2026-06-17 17:00:00', 0)
        `;

        console.log("Completed seeding assistances.");
    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await sql.close();
    }
}

main();
