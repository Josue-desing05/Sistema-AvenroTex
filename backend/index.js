const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('dotenv').config();

const app = express();

// Configuración estricta de CORS para permitir la conexión de la Tablet
app.use(cors({
    origin: 'http://localhost:5173', // Permite explícitamente tu frontend de React
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Configuración de la base de datos
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

// =============================================================================
// 1. RUTA REPARADA: VALIDAR CREDENCIALES (Login de la Tablet con RTRIM)
// =============================================================================
app.post('/api/asistencias/verificar-trabajador', async (req, res) => {
    const { dni, pin } = req.body;
    
    if (!dni || !pin) {
        return res.status(400).json({ error: 'DNI y PIN requeridos.' });
    }

    try {
        // Usamos RTRIM para limpiar los espacios del CHAR y convertimos la hora a formato texto seguro
        const result = await sql.query`
            SELECT T.id_trabajador, T.nombres, T.apellidos, 
                   CONVERT(VARCHAR, H.hora_entrada, 108) as hora_entrada, 
                   H.minutos_tolerancia
            FROM TRABAJADORES T
            INNER JOIN HORARIOS H ON T.id_horario = H.id_horario
            WHERE T.dni = ${dni.trim()} AND RTRIM(T.pin_seguridad) = ${pin.trim()} AND T.estado = 'ACTIVO'
        `;

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'DNI o PIN incorrectos en el sistema.' });
        }

        return res.json({ success: true, trabajador: result.recordset[0] });

    } catch (error) {
        console.error("Error en servidor al verificar:", error.message);
        return res.status(500).json({ error: 'Error interno: ' + error.message });
    }
});
// =============================================================================
// 2. RUTA: GRABAR MARCA ESPECÍFICA (Entrada, Almuerzo o Salida)
// =============================================================================
app.post('/api/asistencias/registrar-marca', async (req, res) => {
    const { id_trabajador, tipoMarca } = req.body;
    const hoy = new Date().toISOString().split('T')[0];
    const ahora = new Date();

    try {
        // Consultamos qué marcas ya tiene el trabajador el día de hoy
        const registroHoy = await sql.query`
            SELECT id_asistencia, hora_entrada, salida_refrigerio, entrada_refrigerio, hora_salida 
            FROM ASISTENCIAS 
            WHERE id_trabajador = ${id_trabajador} AND fecha = ${hoy}
        `;

        const asistencia = registroHoy.recordset[0];

        // ---------------------------------------------------------------------
        // 1. CONTROL: MARCAR ENTRADA
        // ---------------------------------------------------------------------
        if (tipoMarca === 'ENTRADA') {
            if (asistencia) {
                return res.status(400).json({ error: 'Ya registraste tu ENTRADA el día de hoy.' });
            }

            const datosHorario = await sql.query`
                SELECT CONVERT(VARCHAR, H.hora_entrada, 108) as hora_entrada, H.minutos_tolerancia 
                FROM TRABAJADORES T
                INNER JOIN HORARIOS H ON T.id_horario = H.id_horario
                WHERE T.id_trabajador = ${id_trabajador}
            `;
            
            const empleado = datosHorario.recordset[0];
            const [h, m] = empleado.hora_entrada.split(':');
            const horaLimite = new Date();
            horaLimite.setHours(parseInt(h), parseInt(m) + empleado.minutos_tolerancia, 0);

            let minutosTardanza = 0;
            if (ahora > horaLimite) {
                minutosTardanza = Math.floor((ahora - horaLimite) / 1000 / 60);
            }

            await sql.query`
                INSERT INTO ASISTENCIAS (id_trabajador, fecha, hora_entrada, minutos_tardanza)
                VALUES (${id_trabajador}, ${hoy}, ${ahora}, ${minutosTardanza})
            `;
            return res.json({ success: true, message: '¡ENTRADA GRABADA!', detalle: minutosTardanza > 0 ? `Tardanza: ${minutosTardanza} min.` : 'A tiempo.' });
        }

        // --- DE AQUÍ EN ADELANTE, ES OBLIGATORIO QUE EXISTA ENTRADA ---
        if (!asistencia) {
            return res.status(400).json({ error: 'ORDEN REQUERIDO: Primero debes marcar tu ENTRADA.' });
        }

        // ---------------------------------------------------------------------
        // 2. CONTROL: SALIDA A ALMUERZO
        // ---------------------------------------------------------------------
        if (tipoMarca === 'SALIDA_REFRIGERIO') {
            if (asistencia.salida_refrigerio) {
                return res.status(400).json({ error: 'Ya registraste tu SALIDA A ALMUERZO hoy.' });
            }
            await sql.query`
                UPDATE ASISTENCIAS SET salida_refrigerio = ${ahora} WHERE id_asistencia = ${asistencia.id_asistencia}
            `;
            return res.json({ success: true, message: '¡BUEN PROVECHO! Inicio de almuerzo grabado.' });
        }

        // ---------------------------------------------------------------------
        // 3. CONTROL: RETORNO DE ALMUERZO
        // ---------------------------------------------------------------------
        if (tipoMarca === 'ENTRADA_REFRIGERIO') {
            if (!asistencia.salida_refrigerio) {
                return res.status(400).json({ error: 'ORDEN REQUERIDO: Primero debes marcar SALIDA A ALMUERZO.' });
            }
            if (asistencia.entrada_refrigerio) {
                return res.status(400).json({ error: 'Ya registraste tu RETORNO DE ALMUERZO hoy.' });
            }
            await sql.query`
                UPDATE ASISTENCIAS SET entrada_refrigerio = ${ahora} WHERE id_asistencia = ${asistencia.id_asistencia}
            `;
            return res.json({ success: true, message: '¡A TRABAJAR! Retorno de almuerzo grabado.' });
        }

        // ---------------------------------------------------------------------
        // 4. CONTROL: MARCAR SALIDA FINAL
        // ---------------------------------------------------------------------
        if (tipoMarca === 'SALIDA') {
            if (!asistencia.entrada_refrigerio) {
                return res.status(400).json({ error: 'ORDEN REQUERIDO: Primero debes registrar tu RETORNO DE ALMUERZO.' });
            }
            if (asistencia.hora_salida) {
                return res.status(400).json({ error: 'Ya registraste tu SALIDA final de la jornada.' });
            }
            await sql.query`
                UPDATE ASISTENCIAS SET hora_salida = ${ahora} WHERE id_asistencia = ${asistencia.id_asistencia}
            `;
            return res.json({ success: true, message: '¡HASTA LUEGO! Salida grabada correctamente.' });
        }

        return res.status(400).json({ error: 'Operación no reconocida.' });

    } catch (error) {
        return res.status(500).json({ error: 'Error en base de datos: ' + error.message });
    }
});

// =============================================================================
// RUTA ADMINISTRATIVA: OBTENER EL TAREO DIARIO EN TIEMPO REAL
// =============================================================================
app.get('/api/admin/asistencias-hoy', async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];

    try {
        // Trae la lista de asistencias del día combinando los datos del operario y su cargo
        const result = await sql.query`
            SELECT 
                A.id_asistencia,
                T.dni,
                (T.nombres + ' ' + T.apellidos) AS empleado,
                C.nombre_cargo AS cargo,
                CONVERT(VARCHAR, A.hora_entrada, 108) AS entrada,
                CONVERT(VARCHAR, A.salida_refrigerio, 108) AS salida_almuerzo,
                CONVERT(VARCHAR, A.entrada_refrigerio, 108) AS retorno_almuerzo,
                CONVERT(VARCHAR, A.hora_salida, 108) AS salida,
                A.minutos_tardanza
            FROM ASISTENCIAS A
            INNER JOIN TRABAJADORES T ON A.id_trabajador = T.id_trabajador
            INNER JOIN CARGOS C ON T.id_cargo = C.id_cargo
            WHERE A.fecha = ${hoy}
            ORDER BY A.hora_entrada DESC
        `;

        res.json({ success: true, datos: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareo: ' + error.message });
    }
});

// =============================================================================
// RUTA ADMINISTRATIVA: REGISTRAR UN NUEVO TRABAJADOR
// =============================================================================
// =============================================================================
// RUTA ADMINISTRATIVA: REGISTRAR UN NUEVO TRABAJADOR
// =============================================================================
app.post('/api/admin/trabajadores', async (req, res) => {
    const { dni, nombres, apellidos, pin, id_cargo, sueldo_base, asignacion_familiar } = req.body;

    // Validamos campos mínimos obligatorios
    if (!dni || !nombres || !apellidos || !pin) {
        return res.status(400).json({ error: 'Todos los campos (DNI, Nombres, Apellidos, PIN) son obligatorios.' });
    }

    try {
        // Verificamos si el DNI ya se encuentra registrado
        const existe = await sql.query`SELECT 1 FROM TRABAJADORES WHERE dni = ${dni}`;
        if (existe.recordset.length > 0) {
            return res.status(400).json({ error: 'El DNI ingresado ya pertenece a un trabajador.' });
        }

        // Recuperamos el primer régimen y horario que existan en tus catálogos
        const catalogos = await sql.query`
            SELECT TOP 1 
                (SELECT TOP 1 id_regimen FROM REGIMENES_PENSIONARIOS) as id_regimen,
                (SELECT TOP 1 id_horario FROM HORARIOS) as id_horario
        `;
        
        const { id_regimen, id_horario } = catalogos.recordset[0];

        if (!id_regimen || !id_horario) {
            return res.status(400).json({ error: 'Faltan configurar catálogos maestros (Regímenes o Horarios) en la Base de Datos.' });
        }

        const cargoId = id_cargo ? parseInt(id_cargo) : 1;
        const asigFamVal = asignacion_familiar ? 1 : 0;

        // Insertamos el nuevo registro obteniendo el ID insertado
        const result = await sql.query`
            INSERT INTO TRABAJADORES (id_cargo, id_regimen, id_horario, dni, nombres, apellidos, fecha_ingreso, asignacion_familiar, pin_seguridad, estado)
            OUTPUT INSERTED.id_trabajador
            VALUES (${cargoId}, ${id_regimen}, ${id_horario}, ${dni}, ${nombres}, ${apellidos}, GETDATE(), ${asigFamVal}, ${pin}, 'ACTIVO')
        `;

        const id_trabajador = result.recordset[0].id_trabajador;

        // Creamos su contrato activo
        await sql.query`
            INSERT INTO CONTRATOS (id_trabajador, tipo_contrato, fecha_inicio, remuneracion_pactada, estado)
            VALUES (${id_trabajador}, 'PLANILLA', GETDATE(), ${sueldo_base || 1025.00}, 'ACTIVO')
        `;

        res.json({ success: true, message: '¡Trabajador registrado y habilitado para marcar en el taller con su respectivo contrato!' });
    } catch (error) {
        res.status(500).json({ error: 'Error al insertar trabajador: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: OBTENER LISTA DE CARGOS / ROLES
// =============================================================================
app.get('/api/admin/cargos', async (req, res) => {
    try {
        const result = await sql.query`SELECT id_cargo, nombre_cargo, descripcion FROM CARGOS`;
        res.json({ success: true, datos: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener cargos: ' + error.message });
    }
});

// =============================================================================
// 1. ENDPOINT: LISTA COMPLETA DE PERSONAL (Para Personal.jsx)
// =============================================================================
app.get('/api/admin/trabajadores-lista', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                T.id_trabajador,
                T.dni,
                T.nombres,
                T.apellidos,
                C.nombre_cargo AS cargo,
                R.nombre AS regimen,
                CO.remuneracion_pactada AS sueldo_base,
                T.estado
            FROM TRABAJADORES T
            INNER JOIN CARGOS C ON T.id_cargo = C.id_cargo
            INNER JOIN REGIMENES_PENSIONARIOS R ON T.id_regimen = R.id_regimen
            LEFT JOIN CONTRATOS CO ON T.id_trabajador = CO.id_trabajador AND CO.estado = 'ACTIVO'
        `;
        res.json({ success: true, datos: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al listar personal: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: HISTORIAL COMPLETO DE ASISTENCIAS (Para Asistencia.jsx)
// =============================================================================
app.get('/api/admin/asistencias-historial', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                A.id_asistencia,
                A.id_trabajador,
                A.fecha,
                CONVERT(VARCHAR, A.fecha, 23) AS fecha_formateada,
                (T.nombres + ' ' + T.apellidos) AS empleado,
                C.nombre_cargo AS cargo,
                CONVERT(VARCHAR, A.hora_entrada, 108) AS entrada,
                CONVERT(VARCHAR, A.salida_refrigerio, 108) AS salida_almuerzo,
                CONVERT(VARCHAR, A.entrada_refrigerio, 108) AS retorno_almuerzo,
                CONVERT(VARCHAR, A.hora_salida, 108) AS salida,
                A.minutos_tardanza
            FROM ASISTENCIAS A
            INNER JOIN TRABAJADORES T ON A.id_trabajador = T.id_trabajador
            INNER JOIN CARGOS C ON T.id_cargo = C.id_cargo
            ORDER BY A.fecha DESC, A.hora_entrada DESC
        `;
        res.json({ success: true, datos: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: CONSOLIDADO DE ASISTENCIA (Por rango de fecha)
// =============================================================================
app.get('/api/admin/asistencias-consolidado', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'Rango de fechas (fechaInicio, fechaFin) requerido.' });
    }

    try {
        // Obtenemos todos los trabajadores activos
        const trabajadoresRes = await sql.query`
            SELECT T.id_trabajador, T.dni, (T.nombres + ' ' + T.apellidos) AS empleado, C.nombre_cargo AS cargo
            FROM TRABAJADORES T
            INNER JOIN CARGOS C ON T.id_cargo = C.id_cargo
            WHERE T.estado = 'ACTIVO'
        `;

        const trabajadores = trabajadoresRes.recordset;

        // Obtenemos asistencias en el rango
        const asistenciasRes = await sql.query`
            SELECT id_trabajador, fecha, hora_entrada, minutos_tardanza
            FROM ASISTENCIAS
            WHERE fecha BETWEEN ${fechaInicio} AND ${fechaFin}
        `;
        const asistencias = asistenciasRes.recordset;

        // Obtenemos justificaciones en el rango
        const justificacionesRes = await sql.query`
            SELECT id_trabajador, fecha, tipo_justificacion
            FROM JUSTIFICACIONES_INASISTENCIA
            WHERE fecha BETWEEN ${fechaInicio} AND ${fechaFin}
        `;
        const justificaciones = justificacionesRes.recordset;

        // Obtenemos vacaciones en el rango
        const vacacionesRes = await sql.query`
            SELECT id_trabajador, fecha_inicio, fecha_fin, dias_solicitados
            FROM VACACIONES
            WHERE estado_vacacion = 'Aprobado' AND 
                  ((fecha_inicio <= ${fechaFin} AND fecha_fin >= ${fechaInicio}))
        `;
        const vacaciones = vacacionesRes.recordset;

        // Calcular días laborables (excluyendo domingos) en el rango
        const start = new Date(fechaInicio + 'T00:00:00');
        const end = new Date(fechaFin + 'T23:59:59');
        let diasLaborables = 0;
        let curr = new Date(start);
        while (curr <= end) {
            if (curr.getDay() !== 0) { // 0 = Domingo
                diasLaborables++;
            }
            curr.setDate(curr.getDate() + 1);
        }

        const consolidados = [];

        for (const t of trabajadores) {
            const id = t.id_trabajador;

            // Asistencias válidas (con hora de entrada)
            const listAsis = asistencias.filter(a => a.id_trabajador === id && a.hora_entrada !== null);
            const numAsistencias = listAsis.length;

            // Tardanzas
            const numTardanzas = listAsis.filter(a => a.minutos_tardanza > 0).length;
            const totalMinutosTardanza = listAsis.reduce((sum, a) => sum + (a.minutos_tardanza || 0), 0);

            // Justificaciones
            const numJustificaciones = justificaciones.filter(j => j.id_trabajador === id).length;

            // Días de vacaciones en este rango
            let diasVacaciones = 0;
            const listVac = vacaciones.filter(v => v.id_trabajador === id);
            for (const v of listVac) {
                const vStart = new Date(v.fecha_inicio) > start ? new Date(v.fecha_inicio) : start;
                const vEnd = new Date(v.fecha_fin) < end ? new Date(v.fecha_fin) : end;
                if (vStart <= vEnd) {
                    let vCurr = new Date(vStart);
                    while (vCurr <= vEnd) {
                        if (vCurr.getDay() !== 0) {
                            diasVacaciones++;
                        }
                        vCurr.setDate(vCurr.getDate() + 1);
                    }
                }
            }

            // Faltas: días laborables - asistencias - vacaciones - justificaciones
            const numFaltas = Math.max(0, diasLaborables - numAsistencias - diasVacaciones - numJustificaciones);

            consolidados.push({
                id_trabajador: id,
                dni: t.dni,
                empleado: t.empleado,
                cargo: t.cargo,
                asistencias: numAsistencias,
                tardanzas: numTardanzas,
                minutos_tardanza: totalMinutosTardanza,
                faltas: numFaltas,
                justificaciones: numJustificaciones,
                vacaciones: diasVacaciones,
                dias_laborables: diasLaborables
            });
        }

        res.json({ success: true, datos: consolidados });

    } catch (error) {
        res.status(500).json({ error: 'Error al procesar consolidado: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: OBTENER LISTA DE JUSTIFICACIONES
// =============================================================================
app.get('/api/admin/justificaciones-lista', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                J.id_justificacion,
                J.id_asistencia,
                J.id_trabajador,
                CONVERT(VARCHAR, J.fecha, 23) AS fecha,
                J.tipo_justificacion,
                J.descripcion,
                CONVERT(VARCHAR, J.fecha_registro, 120) AS fecha_registro,
                (T.nombres + ' ' + T.apellidos) AS empleado,
                C.nombre_cargo AS cargo
            FROM JUSTIFICACIONES_INASISTENCIA J
            INNER JOIN TRABAJADORES T ON J.id_trabajador = T.id_trabajador
            INNER JOIN CARGOS C ON T.id_cargo = C.id_cargo
            ORDER BY J.fecha_registro DESC
        `;
        res.json({ success: true, datos: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener justificaciones: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: JUSTIFICAR INASISTENCIA (FALTA)
// =============================================================================
app.post('/api/admin/asistencias/justificar', async (req, res) => {
    const { id_trabajador, fecha, tipo_justificacion, descripcion } = req.body;
    if (!id_trabajador || !fecha || !tipo_justificacion || !descripcion) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }
    try {
        // Verificar si ya existe asistencia para ese trabajador y fecha
        let asistenciaRes = await sql.query`
            SELECT id_asistencia FROM ASISTENCIAS 
            WHERE id_trabajador = ${id_trabajador} AND fecha = ${fecha}
        `;
        let id_asistencia;
        if (asistenciaRes.recordset.length === 0) {
            // Crear registro de asistencia vacío para poder asociar la justificación
            const newAsis = await sql.query`
                INSERT INTO ASISTENCIAS (id_trabajador, fecha, hora_entrada, salida_refrigerio, entrada_refrigerio, hora_salida, minutos_tardanza)
                OUTPUT INSERTED.id_asistencia
                VALUES (${id_trabajador}, ${fecha}, NULL, NULL, NULL, NULL, 0)
            `;
            id_asistencia = newAsis.recordset[0].id_asistencia;
        } else {
            id_asistencia = asistenciaRes.recordset[0].id_asistencia;
        }

        // Insertar en JUSTIFICACIONES_INASISTENCIA
        await sql.query`
            INSERT INTO JUSTIFICACIONES_INASISTENCIA (id_asistencia, id_trabajador, fecha, tipo_justificacion, descripcion, fecha_registro)
            VALUES (${id_asistencia}, ${id_trabajador}, ${fecha}, ${tipo_justificacion}, ${descripcion}, GETDATE())
        `;
        res.json({ success: true, message: 'Falta justificada registrada con éxito.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al justificar falta: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: AGREGAR ASISTENCIA MANUAL
// =============================================================================
app.post('/api/admin/asistencias/manual', async (req, res) => {
    const { id_trabajador, fecha, entrada, salida_almuerzo, retorno_almuerzo, salida } = req.body;
    if (!id_trabajador || !fecha || !entrada) {
        return res.status(400).json({ error: 'Trabajador, fecha y hora de entrada son obligatorios.' });
    }
    try {
        const parsedEntrada = new Date(`${fecha}T${entrada}:00`);
        const parsedSalidaAlmuerzo = salida_almuerzo ? new Date(`${fecha}T${salida_almuerzo}:00`) : null;
        const parsedRetornoAlmuerzo = retorno_almuerzo ? new Date(`${fecha}T${retorno_almuerzo}:00`) : null;
        const parsedSalida = salida ? new Date(`${fecha}T${salida}:00`) : null;

        // Calcular minutos de tardanza
        const datosHorario = await sql.query`
            SELECT CONVERT(VARCHAR, H.hora_entrada, 108) as hora_entrada, H.minutos_tolerancia 
            FROM TRABAJADORES T
            INNER JOIN HORARIOS H ON T.id_horario = H.id_horario
            WHERE T.id_trabajador = ${id_trabajador}
        `;
        let minutosTardanza = 0;
        if (datosHorario.recordset.length > 0) {
            const empleado = datosHorario.recordset[0];
            const [h, m] = empleado.hora_entrada.split(':');
            const horaLimite = new Date(`${fecha}T00:00:00`);
            horaLimite.setHours(parseInt(h), parseInt(m) + empleado.minutos_tolerancia, 0);
            
            if (parsedEntrada > horaLimite) {
                minutosTardanza = Math.floor((parsedEntrada - horaLimite) / 1000 / 60);
            }
        }

        // Verificar si ya existe asistencia
        const existe = await sql.query`
            SELECT id_asistencia FROM ASISTENCIAS 
            WHERE id_trabajador = ${id_trabajador} AND fecha = ${fecha}
        `;

        if (existe.recordset.length > 0) {
            const id_asistencia = existe.recordset[0].id_asistencia;
            await sql.query`
                UPDATE ASISTENCIAS 
                SET hora_entrada = ${parsedEntrada}, 
                    salida_refrigerio = ${parsedSalidaAlmuerzo}, 
                    entrada_refrigerio = ${parsedRetornoAlmuerzo}, 
                    hora_salida = ${parsedSalida}, 
                    minutos_tardanza = ${minutosTardanza}
                WHERE id_asistencia = ${id_asistencia}
            `;
        } else {
            await sql.query`
                INSERT INTO ASISTENCIAS (id_trabajador, fecha, hora_entrada, salida_refrigerio, entrada_refrigerio, hora_salida, minutos_tardanza)
                VALUES (${id_trabajador}, ${fecha}, ${parsedEntrada}, ${parsedSalidaAlmuerzo}, ${parsedRetornoAlmuerzo}, ${parsedSalida}, ${minutosTardanza})
            `;
        }

        res.json({ success: true, message: 'Asistencia manual registrada correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar asistencia manual: ' + error.message });
    }
});

// =============================================================================
// 2. ENDPOINT: PROCESAMIENTO DE PLANILLA MENSUAL (Para Planilla.jsx)
// =============================================================================
app.get('/api/admin/planilla-periodo/:mesAno', async (req, res) => {
    const { mesAno } = req.params; // Ejemplo: "2026-06"

    try {
        // Obtenemos los trabajadores con sus contratos activos y su AFP/ONP correspondiente
        const result = await sql.query`
            SELECT 
                (T.nombres + ' ' + T.apellidos) AS nombre,
                R.nombre AS regimen,
                CO.remuneracion_pactada AS sueldo,
                CASE WHEN T.asignacion_familiar = 1 THEN 102.50 ELSE 0.00 END AS asigFam,
                ISNULL(SUM(DHE.monto_25 + DHE.monto_35 + DHE.monto_feriado), 0) AS hExtras,
                R.tasa_aporte, R.tasa_comision, R.tasa_prima_seguro
            FROM TRABAJADORES T
            INNER JOIN REGIMENES_PENSIONARIOS R ON T.id_regimen = R.id_regimen
            INNER JOIN CONTRATOS CO ON T.id_trabajador = CO.id_trabajador AND CO.estado = 'ACTIVO'
            LEFT JOIN PLANILLAS P ON P.periodo_mes_ano = ${mesAno}
            LEFT JOIN DETALLE_HORAS_EXTRAS DHE ON T.id_trabajador = DHE.id_trabajador AND DHE.id_planilla = P.id_planilla
            GROUP BY T.id_trabajador, T.nombres, T.apellidos, R.nombre, CO.remuneracion_pactada, T.asignacion_familiar, R.tasa_aporte, R.tasa_comision, R.tasa_prima_seguro
        `;

        // Calculamos las retenciones de ley peruana dinámicamente según tus tasas de la BD
        const datosProcesados = result.recordset.map(emp => {
            const brutoTotal = emp.sueldo + emp.asigFam + emp.hExtras;
            const tasaTotal = (emp.tasa_aporte + emp.tasa_comision + emp.tasa_prima_seguro) / 100;
            const retenciones = -(brutoTotal * tasaTotal);
            const neto = brutoTotal + retenciones;

            return {
                nombre: emp.nombre,
                regimen: emp.regimen,
                sueldo: emp.sueldo,
                asigFam: emp.asigFam,
                hExtras: emp.hExtras,
                retenciones: retenciones,
                neto: neto
            };
        });

        res.json({ success: true, datos: datosProcesados });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar planilla: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: PROGRAMAR VACACIONES (Para Vacaciones.jsx)
// =============================================================================
app.post('/api/admin/vacaciones', async (req, res) => {
    const { id_trabajador, fecha_inicio, fecha_fin } = req.body;
    if (!id_trabajador || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }
    try {
        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);
        const diffTime = Math.abs(fin - inicio);
        const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        await sql.query`
            INSERT INTO VACACIONES (id_trabajador, fecha_inicio, fecha_fin, dias_solicitados, estado_vacacion)
            VALUES (${id_trabajador}, ${fecha_inicio}, ${fecha_fin}, ${dias}, 'Aprobado')
        `;
        res.json({ success: true, message: 'Vacaciones programadas correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al programar vacaciones: ' + error.message });
    }
});

// =============================================================================
// 3. ENDPOINT: LISTAR CRONOGRAMA DE VACACIONES (Para Vacaciones.jsx)
// =============================================================================
app.get('/api/admin/vacaciones-lista', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                (T.nombres + ' ' + T.apellidos) AS nombre,
                C.nombre_cargo AS subarea,
                CONVERT(VARCHAR, V.fecha_inicio, 23) AS inicio,
                CONVERT(VARCHAR, V.fecha_fin, 23) AS fin,
                V.dias_solicitados AS dias,
                V.estado_vacacion AS estado
            FROM VACACIONES V
            INNER JOIN TRABAJADORES T ON V.id_trabajador = T.id_trabajador
            INNER JOIN CARGOS C ON T.id_cargo = C.id_cargo
        `;
        res.json({ success: true, datos: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener vacaciones: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: DESHABILITAR / HABILITAR TRABAJADOR
// =============================================================================
app.put('/api/admin/trabajadores/:id/toggle-estado', async (req, res) => {
    const { id } = req.params;
    try {
        const currentRes = await sql.query`SELECT estado FROM TRABAJADORES WHERE id_trabajador = ${id}`;
        if (currentRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Trabajador no encontrado.' });
        }
        const currentEstado = currentRes.recordset[0].estado;
        const nuevoEstado = currentEstado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        
        await sql.query`UPDATE TRABAJADORES SET estado = ${nuevoEstado} WHERE id_trabajador = ${id}`;
        res.json({ success: true, message: `Trabajador marcado como ${nuevoEstado}.`, nuevoEstado });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado del trabajador: ' + error.message });
    }
});

// =============================================================================
// NUEVO ENDPOINT: ELIMINAR TRABAJADOR (Y SU HISTORIAL EN ORDEN DE CONSTRAINT)
// =============================================================================
app.delete('/api/admin/trabajadores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Ejecutar borrados en orden de llave foránea para evitar conflictos de constraint
        await sql.query`DELETE FROM JUSTIFICACIONES_INASISTENCIA WHERE id_trabajador = ${id}`;
        await sql.query`DELETE FROM ASISTENCIAS WHERE id_trabajador = ${id}`;
        await sql.query`DELETE FROM VACACIONES WHERE id_trabajador = ${id}`;
        await sql.query`DELETE FROM CONTRATOS WHERE id_trabajador = ${id}`;
        await sql.query`DELETE FROM TRABAJADORES WHERE id_trabajador = ${id}`;

        res.json({ success: true, message: 'Trabajador y todo su historial eliminados correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar trabajador: ' + error.message });
    }
});

// Levantar el servidor conectando a SQL Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', async () => {
    console.log(`🚀 Servidor backend encendido en: http://127.0.0.1:${PORT}`);
    try {
        await sql.connect(dbConfig);
        console.log('====================================================');
        console.log('✔ ¡ÉXITO! Conectado limpiamente a DB_Planilla_Avenrotex');
        console.log('====================================================');
    } catch (error) {
        console.error('❌ Error: ', error.message);
    }
});