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
        console.log("Connecting to SQL Server...");
        await sql.connect(dbConfig);
        console.log("Connected successfully.");

        // Clear previous test records to prevent constraints errors
        console.log("Cleaning old test data...");
        await sql.query`DELETE FROM PRODUCCION`;
        await sql.query`DELETE FROM JUSTIFICACIONES_INASISTENCIA`;
        await sql.query`DELETE FROM ASISTENCIAS`;
        await sql.query`DELETE FROM CONTRATOS`;
        await sql.query`DELETE FROM TRABAJADORES WHERE dni IN ('12345678', '87654321')`;

        // Get Horario and Regimen
        const catalogos = await sql.query`
            SELECT TOP 1 
                (SELECT TOP 1 id_regimen FROM REGIMENES_PENSIONARIOS) as id_regimen,
                (SELECT TOP 1 id_horario FROM HORARIOS) as id_horario
        `;
        const { id_regimen, id_horario } = catalogos.recordset[0];

        if (!id_regimen || !id_horario) {
            console.error("Master catalogs not found. Please ensure schedules and pension regimes are populated.");
            process.exit(1);
        }

        // Insert Planchador (cargo 4)
        console.log("Inserting test workers...");
        const resultPlanchador = await sql.query`
            INSERT INTO TRABAJADORES (id_cargo, id_regimen, id_horario, dni, nombres, apellidos, fecha_ingreso, asignacion_familiar, pin_seguridad, estado)
            OUTPUT INSERTED.id_trabajador
            VALUES (4, ${id_regimen}, ${id_horario}, '12345678', 'Carlos', 'Ramirez Planchador', '2026-06-01', 0, '1234', 'ACTIVO')
        `;
        const idCarlos = resultPlanchador.recordset[0].id_trabajador;

        await sql.query`
            INSERT INTO CONTRATOS (id_trabajador, tipo_contrato, fecha_inicio, remuneracion_pactada, estado)
            VALUES (${idCarlos}, 'PLANILLA', '2026-06-01', 0.00, 'ACTIVO')
        `;

        // Insert Costurera (cargo 1)
        const resultCosturera = await sql.query`
            INSERT INTO TRABAJADORES (id_cargo, id_regimen, id_horario, dni, nombres, apellidos, fecha_ingreso, asignacion_familiar, pin_seguridad, estado)
            OUTPUT INSERTED.id_trabajador
            VALUES (1, ${id_regimen}, ${id_horario}, '87654321', 'Maria', 'Costurera Perez', '2026-06-01', 0, '5678', 'ACTIVO')
        `;
        const idMaria = resultCosturera.recordset[0].id_trabajador;

        await sql.query`
            INSERT INTO CONTRATOS (id_trabajador, tipo_contrato, fecha_inicio, remuneracion_pactada, estado)
            VALUES (${idMaria}, 'PLANILLA', '2026-06-01', 1200.00, 'ACTIVO')
        `;

        // Insert Production
        console.log("Inserting production data...");
        await sql.query`
            INSERT INTO PRODUCCION (fecha, cantidad)
            VALUES ('2026-06-15', 120),
                   ('2026-06-16', 80)
        `;

        // Insert Attendance
        console.log("Inserting attendance data...");
        // Carlos Ramirez attended on 15, 16, 17
        await sql.query`
            INSERT INTO ASISTENCIAS (id_trabajador, fecha, hora_entrada, hora_salida, minutos_tardanza)
            VALUES (${idCarlos}, '2026-06-15', '2026-06-15 08:00:00', '2026-06-15 17:00:00', 0),
                   (${idCarlos}, '2026-06-16', '2026-06-16 08:00:00', '2026-06-16 17:00:00', 0),
                   (${idCarlos}, '2026-06-17', '2026-06-17 08:00:00', '2026-06-17 17:00:00', 0)
        `;

        // Maria Perez attended on 15, 16
        await sql.query`
            INSERT INTO ASISTENCIAS (id_trabajador, fecha, hora_entrada, hora_salida, minutos_tardanza)
            VALUES (${idMaria}, '2026-06-15', '2026-06-15 08:00:00', '2026-06-15 17:00:00', 0),
                   (${idMaria}, '2026-06-16', '2026-06-16 08:00:00', '2026-06-16 17:00:00', 0)
        `;

        console.log("Seeding completed successfully.");
    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await sql.close();
    }
}

main();
