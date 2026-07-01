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

        console.log("Cleaning old planchado records for Luis Carlos...");
        await sql.query`DELETE FROM PLANCHADO WHERE id_trabajador = 1`;

        console.log("Inserting planchado data for worker ID 1...");
        await sql.query`
            INSERT INTO PLANCHADO (id_trabajador, fecha, cantidad, tarifa_por_saco, fecha_registro)
            VALUES (1, '2026-06-15', 80, 1.50, GETDATE()),
                   (1, '2026-06-16', 120, 1.50, GETDATE()),
                   (1, '2026-06-17', 50, 1.50, GETDATE())
        `;

        console.log("Completed seeding planchado data.");
    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await sql.close();
    }
}

main();
