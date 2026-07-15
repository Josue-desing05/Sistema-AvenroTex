import { useState, useEffect } from 'react';
import axios from 'axios';

function Asistencia() {
  const [subVista, setSubVista] = useState('hoy'); // hoy, historial, justificaciones
  const [busqueda, setBusqueda] = useState('');
  
  // Datos desde BD
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);
  const [asistenciasHistorial, setAsistenciasHistorial] = useState([]);
  const [justificaciones, setJustificaciones] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);

  // Estados de Modales
  const [showJustificarModal, setShowJustificarModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Estados de Formularios
  const [jTrabajadorId, setJTrabajadorId] = useState('');
  const [jFecha, setJFecha] = useState(new Date().toISOString().split('T')[0]);
  const [jTipo, setJTipo] = useState('Médica');
  const [jDesc, setJDesc] = useState('');

  const [mTrabajadorId, setMTrabajadorId] = useState('');
  const [mFecha, setMFecha] = useState(new Date().toISOString().split('T')[0]);
  const [mEntrada, setMEntrada] = useState('08:00');
  const [mSalidaAlm, setMSalidaAlm] = useState('');
  const [mRetornoAlm, setMRetornoAlm] = useState('');
  const [mSalida, setMSalida] = useState('17:00');

  // Estados para horario general
  const [hEntrada, setHEntrada] = useState('08:00');
  const [hSalidaAlm, setHSalidaAlm] = useState('13:00');
  const [hRetornoAlm, setHRetornoAlm] = useState('14:00');
  const [hSalida, setHSalida] = useState('17:00');
  const [hTolerancia, setHTolerancia] = useState(10);

  const cargarAsistenciasHoy = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/asistencias-hoy');
      if (res.data.success) setAsistenciasHoy(res.data.datos);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarHistorial = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/asistencias-historial');
      if (res.data.success) setAsistenciasHistorial(res.data.datos);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarJustificaciones = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/justificaciones-lista');
      if (res.data.success) setJustificaciones(res.data.datos);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarTrabajadores = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/trabajadores-lista');
      if (res.data.success) {
        setTrabajadores(res.data.datos);
        if (res.data.datos.length > 0) {
          setJTrabajadorId(res.data.datos[0].id_trabajador.toString());
          setMTrabajadorId(res.data.datos[0].id_trabajador.toString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cargarHorarioGeneral = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/horario');
      if (res.data.success && res.data.datos) {
        const d = res.data.datos;
        setHEntrada(d.hora_entrada ? d.hora_entrada.slice(0, 5) : '08:00');
        setHSalidaAlm(d.inicio_refrigerio ? d.inicio_refrigerio.slice(0, 5) : '13:00');
        setHRetornoAlm(d.fin_refrigerio ? d.fin_refrigerio.slice(0, 5) : '14:00');
        setHSalida(d.hora_salida ? d.hora_salida.slice(0, 5) : '17:00');
        setHTolerancia(d.minutos_tolerancia !== null ? d.minutos_tolerancia : 10);
      }
    } catch (err) {
      console.error("Error al cargar horario general:", err);
    }
  };

  const handleGuardarHorario = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('http://127.0.0.1:3000/api/admin/horario', {
        hora_entrada: hEntrada,
        inicio_refrigerio: hSalidaAlm,
        fin_refrigerio: hRetornoAlm,
        hora_salida: hSalida,
        minutos_tolerancia: parseInt(hTolerancia)
      });
      if (res.data.success) {
        alert("¡Horario general actualizado y guardado correctamente!");
      }
    } catch (err) {
      alert("Error al guardar horario: " + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    (async () => {
      await cargarAsistenciasHoy();
      await cargarHistorial();
      await cargarJustificaciones();
      await cargarTrabajadores();
      await cargarHorarioGeneral();
    })();
  }, []);

  // Handlers para submit
  const handleJustificar = async (e) => {
    e.preventDefault();
    if (!jTrabajadorId || !jFecha || !jTipo || !jDesc) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/admin/asistencias/justificar', {
        id_trabajador: parseInt(jTrabajadorId),
        fecha: jFecha,
        tipo_justificacion: jTipo,
        descripcion: jDesc
      });
      if (res.data.success) {
        alert("¡Falta justificada registrada correctamente!");
        setShowJustificarModal(false);
        setJDesc('');
        await cargarJustificaciones();
        await cargarAsistenciasHoy();
        await cargarHistorial();
      }
    } catch (err) {
      alert("Error al registrar justificación: " + (err.response?.data?.error || err.message));
    }
  };

  const handleManual = async (e) => {
    e.preventDefault();
    if (!mTrabajadorId || !mFecha || !mEntrada) {
      alert("Trabajador, fecha y hora de entrada son requeridos.");
      return;
    }
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/admin/asistencias/manual', {
        id_trabajador: parseInt(mTrabajadorId),
        fecha: mFecha,
        entrada: mEntrada,
        salida_almuerzo: mSalidaAlm || null,
        retorno_almuerzo: mRetornoAlm || null,
        salida: mSalida || null
      });
      if (res.data.success) {
        alert("¡Asistencia manual registrada con éxito!");
        setShowManualModal(false);
        await cargarAsistenciasHoy();
        await cargarHistorial();
      }
    } catch (err) {
      alert("Error al registrar asistencia: " + (err.response?.data?.error || err.message));
    }
  };

  // Filtrado reactivo por nombre o DNI
  const filtradosHoy = asistenciasHoy.filter(a => 
    a.empleado?.toLowerCase().includes(busqueda.toLowerCase()) || a.dni?.includes(busqueda)
  );

  const filtradosHistorial = asistenciasHistorial.filter(a => 
    a.empleado?.toLowerCase().includes(busqueda.toLowerCase()) || a.dni?.includes(busqueda)
  );

  const filtradosJustificaciones = justificaciones.filter(j => 
    j.empleado?.toLowerCase().includes(busqueda.toLowerCase()) || j.cargo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // KPIs dinámicos
  const totalPersonal = trabajadores.length;
  const presentes = asistenciasHoy.filter(a => a.entrada).length;
  const tardanzas = asistenciasHoy.filter(a => a.minutos_tardanza > 0).length;
  const ausentes = Math.max(0, totalPersonal - presentes);

  return (
    <div className="modulo-contenido">
      {/* Sub-navegación interna */}
      <div className="sub-navegacion">
        <button className={subVista === 'hoy' ? 'activo' : ''} onClick={() => setSubVista('hoy')}>Hoy</button>
        <button className={subVista === 'historial' ? 'activo' : ''} onClick={() => setSubVista('historial')}>Historial</button>
        <button className={subVista === 'justificaciones' ? 'activo' : ''} onClick={() => setSubVista('justificaciones')}>Justificaciones</button>
        <button className={subVista === 'configurar' ? 'activo' : ''} onClick={() => setSubVista('configurar')}>Configurar Horario</button>
      </div>

      {/* KPIs de Asistencia */}
      <div className="contenedor-kpis">
        <div className="tarjeta-kpi">
          <h4>Total personal</h4>
          <p className="kpi-numero">{totalPersonal}</p>
          <span>activos</span>
        </div>
        <div className="tarjeta-kpi kpi-verde">
          <h4>Presentes</h4>
          <p className="kpi-numero">{presentes}</p>
          <span>marcaron entrada hoy</span>
        </div>
        <div className="tarjeta-kpi kpi-amarillo">
          <h4>Con tardanza</h4>
          <p className="kpi-numero">{tardanzas}</p>
          <span>hoy</span>
        </div>
        <div className="tarjeta-kpi kpi-rojo">
          <h4>Ausentes</h4>
          <p className="kpi-numero">{ausentes}</p>
          <span>sin marca hoy</span>
        </div>
      </div>

      {/* Controladores */}
      <div className="barra-acciones-tabla">
        <input 
          type="text" 
          className="buscador-entrada" 
          placeholder="Buscar trabajador..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="bloque-botones-derecha">
          <button className="btn-secundario" onClick={() => setShowJustificarModal(true)}>Justificar Falta</button>
          <button className="btn-primario-azul" onClick={() => setShowManualModal(true)}>Registrar Marca Manual</button>
        </div>
      </div>

      {/* Grilla de Asistencia Dinámica según Sub-Vista */}
      {subVista === 'hoy' && (
        <table className="tabla-sistema">
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Cargo</th>
              <th>Entrada</th>
              <th>S. Refrg.</th>
              <th>E. Refrg.</th>
              <th>Salida</th>
              <th>Tardanza</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradosHoy.map((a, i) => (
              <tr key={i}>
                <td style={{ fontWeight: '600', color: 'var(--color-texto)' }}>{a.empleado}</td>
                <td><span className={`badge cargo-${a.cargo?.toLowerCase()}`}>{a.cargo}</span></td>
                <td className="hora-col">{a.entrada || '—'}</td>
                <td className="hora-col">{a.salida_almuerzo || '—'}</td>
                <td className="hora-col">{a.retorno_almuerzo || '—'}</td>
                <td className="hora-col">{a.salida || '—'}</td>
                <td style={{ color: '#eab308', fontWeight: 'bold' }}>
                  {a.minutos_tardanza > 0 ? `${a.minutos_tardanza} min` : '—'}
                </td>
                <td>
                  <span className={`badge estado-${a.entrada ? (a.minutos_tardanza > 0 ? 'tardanza' : 'presente') : 'ausente'}`}>
                    {a.entrada ? (a.minutos_tardanza > 0 ? 'Tardanza' : 'Presente') : 'Ausente'}
                  </span>
                </td>
                <td><button className="btn-accion-tabla">•••</button></td>
              </tr>
            ))}
            {filtradosHoy.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: '#64748b' }}>No hay marcas de asistencia registradas el día de hoy.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {subVista === 'historial' && (
        <table className="tabla-sistema">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Trabajador</th>
              <th>Cargo</th>
              <th>Entrada</th>
              <th>S. Refrg.</th>
              <th>E. Refrg.</th>
              <th>Salida</th>
              <th>Tardanza</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradosHistorial.map((a, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 'bold' }}>{a.fecha_formateada}</td>
                <td style={{ color: 'var(--color-texto)' }}>{a.empleado}</td>
                <td><span className={`badge cargo-${a.cargo?.toLowerCase()}`}>{a.cargo}</span></td>
                <td className="hora-col">{a.entrada || '—'}</td>
                <td className="hora-col">{a.salida_almuerzo || '—'}</td>
                <td className="hora-col">{a.retorno_almuerzo || '—'}</td>
                <td className="hora-col">{a.salida || '—'}</td>
                <td style={{ color: '#eab308' }}>
                  {a.minutos_tardanza > 0 ? `${a.minutos_tardanza} min` : '—'}
                </td>
                <td>
                  <span className={`badge estado-${a.entrada ? (a.minutos_tardanza > 0 ? 'tardanza' : 'presente') : 'ausente'}`}>
                    {a.entrada ? (a.minutos_tardanza > 0 ? 'Tardanza' : 'Presente') : 'Ausente'}
                  </span>
                </td>
              </tr>
            ))}
            {filtradosHistorial.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: '#64748b' }}>No hay registros en el historial de asistencia.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {subVista === 'justificaciones' && (
        <table className="tabla-sistema">
          <thead>
            <tr>
              <th>Fecha Falta</th>
              <th>Trabajador</th>
              <th>Cargo</th>
              <th>Tipo Justificación</th>
              <th>Descripción / Motivo</th>
              <th>Fecha Registro</th>
            </tr>
          </thead>
          <tbody>
            {filtradosJustificaciones.map((j, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 'bold', color: 'var(--color-texto)' }}>{j.fecha}</td>
                <td style={{ color: 'var(--color-texto)' }}>{j.empleado}</td>
                <td><span className={`badge cargo-${j.cargo?.toLowerCase()}`}>{j.cargo}</span></td>
                <td><span className="badge estado-pendiente">{j.tipo_justificacion}</span></td>
                <td>{j.descripcion}</td>
                <td style={{ fontSize: '12px', color: '#94a3b8' }}>{j.fecha_registro}</td>
              </tr>
            ))}
            {filtradosJustificaciones.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>No hay inasistencias justificadas en el sistema.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {subVista === 'configurar' && (
        <div className="panel-configurar-horario" style={{ maxWidth: '600px', margin: '20px auto', padding: '24px', backgroundColor: 'var(--bg-paneles, #fff)', border: '1px solid var(--border-color, #e5e4e7)', borderRadius: '12px', boxShadow: 'var(--shadow)', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '8px', color: 'var(--color-texto-h)', fontSize: '20px', fontWeight: '600' }}>Programar Horarios del Sistema</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: '1.4' }}>
            Establezca los horarios de entrada, tolerancia, inicio/fin de almuerzo (refrigerio) y salida para el control de asistencia de los operarios.
          </p>
          
          <form onSubmit={handleGuardarHorario}>
            <div className="grupo-formulario-fila">
              <div className="grupo-formulario">
                <label>Hora de Entrada *</label>
                <input 
                  type="time" 
                  value={hEntrada} 
                  onChange={(e) => setHEntrada(e.target.value)} 
                  required 
                />
              </div>

              <div className="grupo-formulario">
                <label>Tolerancia (Minutos) *</label>
                <input 
                  type="number" 
                  min="0"
                  value={hTolerancia} 
                  onChange={(e) => setHTolerancia(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="grupo-formulario-fila" style={{ marginTop: '16px' }}>
              <div className="grupo-formulario">
                <label>Salida a Almuerzo *</label>
                <input 
                  type="time" 
                  value={hSalidaAlm} 
                  onChange={(e) => setHSalidaAlm(e.target.value)} 
                  required 
                />
              </div>
              <div className="grupo-formulario">
                <label>Retorno de Almuerzo *</label>
                <input 
                  type="time" 
                  value={hRetornoAlm} 
                  onChange={(e) => setHRetornoAlm(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="grupo-formulario" style={{ marginTop: '16px' }}>
              <label>Hora de Salida Final *</label>
              <input 
                type="time" 
                value={hSalida} 
                onChange={(e) => setHSalida(e.target.value)} 
                required 
              />
            </div>

            <button 
              type="submit" 
              className="btn-primario-azul" 
              style={{ width: '100%', padding: '12px', fontWeight: 'bold', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', border: 'none', color: '#fff', backgroundColor: '#3b82f6', marginTop: '20px' }}
            >
              Guardar Cambios de Horario
            </button>
          </form>
        </div>
      )}

      {/* Modal Justificar Falta */}
      {showJustificarModal && (
        <div className="modal-overlay">
          <div className="modal-contenedor">
            <div className="modal-cabecera">
              <h3>Justificar Inasistencia</h3>
              <button className="btn-cerrar-modal" onClick={() => setShowJustificarModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleJustificar}>
              <div className="modal-cuerpo">
                <div className="grupo-formulario">
                  <label>Trabajador *</label>
                  <select value={jTrabajadorId} onChange={(e) => setJTrabajadorId(e.target.value)} required>
                    {trabajadores.map(t => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} {t.apellidos} (DNI: {t.dni})</option>
                    ))}
                  </select>
                </div>

                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>Fecha de la Falta *</label>
                    <input 
                      type="date" 
                      value={jFecha} 
                      onChange={(e) => setJFecha(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label>Tipo de Justificación *</label>
                    <select value={jTipo} onChange={(e) => setJTipo(e.target.value)} required>
                      <option value="Médica">Médica (Descanso médico)</option>
                      <option value="Personal">Motivo Personal</option>
                      <option value="Licencia">Licencia con goce</option>
                      <option value="Fuerza Mayor">Fuerza Mayor</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="grupo-formulario">
                  <label>Descripción / Detalle *</label>
                  <textarea 
                    rows="4" 
                    placeholder="Escriba detalladamente el motivo de la falta..." 
                    value={jDesc} 
                    onChange={(e) => setJDesc(e.target.value)} 
                    required
                  />
                </div>
              </div>
              <div className="modal-pie">
                <button type="button" className="btn-cancelar" onClick={() => setShowJustificarModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar">Justificar Falta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Marca Manual */}
      {showManualModal && (
        <div className="modal-overlay">
          <div className="modal-contenedor">
            <div className="modal-cabecera">
              <h3>Registrar Marca Manual</h3>
              <button className="btn-cerrar-modal" onClick={() => setShowManualModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleManual}>
              <div className="modal-cuerpo">
                <div className="grupo-formulario">
                  <label>Trabajador *</label>
                  <select value={mTrabajadorId} onChange={(e) => setMTrabajadorId(e.target.value)} required>
                    {trabajadores.map(t => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} {t.apellidos} (DNI: {t.dni})</option>
                    ))}
                  </select>
                </div>

                <div className="grupo-formulario">
                  <label>Fecha de la Asistencia *</label>
                  <input 
                    type="date" 
                    value={mFecha} 
                    onChange={(e) => setMFecha(e.target.value)} 
                    required 
                  />
                </div>

                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>Hora Entrada *</label>
                    <input 
                      type="time" 
                      value={mEntrada} 
                      onChange={(e) => setMEntrada(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label>Salida Almuerzo (Refrigerio)</label>
                    <input 
                      type="time" 
                      value={mSalidaAlm} 
                      onChange={(e) => setMSalidaAlm(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>Retorno Almuerzo (Refrigerio)</label>
                    <input 
                      type="time" 
                      value={mRetornoAlm} 
                      onChange={(e) => setMRetornoAlm(e.target.value)} 
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label>Hora Salida final</label>
                    <input 
                      type="time" 
                      value={mSalida} 
                      onChange={(e) => setMSalida(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-pie">
                <button type="button" className="btn-cancelar" onClick={() => setShowManualModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar">Registrar Asistencia</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Asistencia;