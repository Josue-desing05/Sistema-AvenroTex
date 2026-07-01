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

        console.log("Creating PRODUCCION table if not exists...");
        const createTableProduccion = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PRODUCCION' and xtype='U')
            BEGIN
                CREATE TABLE PRODUCCION (
                    id_produccion INT IDENTITY(1,1) PRIMARY KEY,
                    fecha DATE NOT NULL UNIQUE,
                    cantidad INT NOT NULL,
                    fecha_registro DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table PRODUCCION created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table PRODUCCION already exists.';
            END
        `;
        await sql.query(createTableProduccion);

        console.log("Creating PLANCHADO table if not exists...");
        const createTablePlanchado = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PLANCHADO' and xtype='U')
            BEGIN
                CREATE TABLE PLANCHADO (
                    id_planchado INT IDENTITY(1,1) PRIMARY KEY,
                    id_trabajador INT NOT NULL,
                    fecha DATE NOT NULL,
                    cantidad INT NOT NULL,
                    tarifa_por_saco DECIMAL(10,2) DEFAULT 1.50,
                    fecha_registro DATETIME DEFAULT GETDATE(),
                    FOREIGN KEY (id_trabajador) REFERENCES TRABAJADORES(id_trabajador),
                    CONSTRAINT UQ_Trabajador_Fecha_Planchado UNIQUE (id_trabajador, fecha)
                );
                PRINT 'Table PLANCHADO created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table PLANCHADO already exists.';
            END
        `;
        await sql.query(createTablePlanchado);

        console.log("Database operations completed successfully.");
    } catch (err) {
        console.error("Error creating database tables:", err);
        process.exit(1);
    } finally {
        await sql.close();
    }
}

main();
