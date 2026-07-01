import { useState, useEffect } from 'react';
import axios from 'axios';

function Produccion() {
  const [subTab, setSubTab] = useState('produccion'); // 'produccion' o 'planchado'
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  // --- Estados de Producción General ---
  const [producciones, setProducciones] = useState([]);
  const [fechaProd, setFechaProd] = useState(new Date().toISOString().split('T')[0]);
  const [cantidadProd, setCantidadProd] = useState('');
  const [showProdModal, setShowProdModal] = useState(false);

  // --- Estados de Planchado (Destajo) ---
  const [planchados, setPlanchados] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [trabajadorId, setTrabajadorId] = useState('');
  const [fechaPlanchado, setFechaPlanchado] = useState(new Date().toISOString().split('T')[0]);
  const [cantidadPlanchado, setCantidadPlanchado] = useState('');
  const [showPlanchadoModal, setShowPlanchadoModal] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar producciones
      const resProd = await axios.get('http://127.0.0.1:3000/api/admin/produccion');
      if (resProd.data.success) {
        setProducciones(resProd.data.datos);
      }

      // 2. Cargar planchados
      const resPlanchado = await axios.get('http://127.0.0.1:3000/api/admin/planchado');
      if (resPlanchado.data.success) {
        setPlanchados(resPlanchado.data.datos);
      }

      // 3. Cargar lista de trabajadores (para filtrar planchadores)
      const resTrab = await axios.get('http://127.0.0.1:3000/api/admin/trabajadores-lista');
      if (resTrab.data.success) {
        const planchadoresList = resTrab.data.datos.filter(
          t => t.cargo?.toLowerCase() === 'planchador'
        );
        setTrabajadores(planchadoresList);
        if (planchadoresList.length > 0) {
          setTrabajadorId(planchadoresList[0].id_trabajador.toString());
        }
      }
    } catch (err) {
      console.error("Error al cargar datos del módulo de producción y planchado:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- Handlers de Producción General ---
  const handleRegistrarProd = async (e) => {
    e.preventDefault();
    if (!fechaProd || !cantidadProd) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/admin/produccion', {
        fecha: fechaProd,
        cantidad: parseInt(cantidadProd)
      });
      if (res.data.success) {
        alert(res.data.message);
        setShowProdModal(false);
        setCantidadProd('');
        await cargarDatos();
      }
    } catch (err) {
      alert("Error al registrar producción: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEliminarProd = async (id, fecha) => {
    if (window.confirm(`¿Está seguro de que desea eliminar el registro de producción del día ${fecha}?`)) {
      try {
        const res = await axios.delete(`http://127.0.0.1:3000/api/admin/produccion/${id}`);
        if (res.data.success) {
          alert(res.data.message);
          await cargarDatos();
        }
      } catch (err) {
        alert("Error al eliminar producción: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // --- Handlers de Planchado por Trabajador ---
  const handleRegistrarPlanchado = async (e) => {
    e.preventDefault();
    if (!trabajadorId || !fechaPlanchado || !cantidadPlanchado) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/admin/planchado', {
        id_trabajador: parseInt(trabajadorId),
        fecha: fechaPlanchado,
        cantidad: parseInt(cantidadPlanchado)
      });
      if (res.data.success) {
        alert(res.data.message);
        setShowPlanchadoModal(false);
        setCantidadPlanchado('');
        await cargarDatos();
      }
    } catch (err) {
      alert("Error al registrar planchado: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEliminarPlanchado = async (id, empleado, fecha) => {
    if (window.confirm(`¿Está seguro de que desea eliminar el registro de planchado de ${empleado} del día ${fecha}?`)) {
      try {
        const res = await axios.delete(`http://127.0.0.1:3000/api/admin/planchado/${id}`);
        if (res.data.success) {
          alert(res.data.message);
          await cargarDatos();
        }
      } catch (err) {
        alert("Error al eliminar planchado: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // --- Cálculos de Fecha para KPIs ---
  const hoyStr = new Date().toISOString().split('T')[0];
  const mesActualStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  const obtenerRangoSemana = () => {
    const hoy = new Date();
    const day = hoy.getDay();
    const diffToMonday = hoy.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(hoy.setDate(diffToMonday));
    lunes.setHours(0, 0, 0, 0);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    return { lunes, domingo };
  };

  const { lunes, domingo } = obtenerRangoSemana();

  // --- Cálculos de KPIs de Producción ---
  const prodHoy = producciones.filter(p => p && p.fecha === hoyStr).reduce((sum, p) => sum + p.cantidad, 0);
  const prodSemana = producciones.filter(p => {
    if (!p || !p.fecha) return false;
    const f = new Date(p.fecha + 'T00:00:00');
    return f >= lunes && f <= domingo;
  }).reduce((sum, p) => sum + p.cantidad, 0);
  const prodMes = producciones.filter(p => p && p.fecha && p.fecha.slice(0, 7) === mesActualStr).reduce((sum, p) => sum + p.cantidad, 0);

  // --- Cálculos de KPIs de Planchado ---
  const planchadoHoy = planchados.filter(p => p && p.fecha === hoyStr).reduce((sum, p) => sum + p.cantidad, 0);
  const planchadoSemana = planchados.filter(p => {
    if (!p || !p.fecha) return false;
    const f = new Date(p.fecha + 'T00:00:00');
    return f >= lunes && f <= domingo;
  }).reduce((sum, p) => sum + p.cantidad, 0);
  const planchadoMes = planchados.filter(p => p && p.fecha && p.fecha.slice(0, 7) === mesActualStr).reduce((sum, p) => sum + p.cantidad, 0);

  // --- Filtrado reactivo en las tablas ---
  const produccionesFiltradas = producciones.filter(p => p && (p.fecha || '').includes(busqueda));
  const planchadosFiltrados = planchados.filter(p => {
    if (!p) return false;
    const nombre = p.planchador || '';
    const fecha = p.fecha || '';
    return nombre.toLowerCase().includes(busqueda.toLowerCase()) || fecha.includes(busqueda);
  });

  return (
    <div className="modulo-contenido">
      {/* Subnavegación del Módulo */}
      <div className="sub-navegacion" style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <button 
          className={subTab === 'produccion' ? 'activo' : ''} 
          onClick={() => { setSubTab('produccion'); setBusqueda(''); }}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'produccion' ? 'var(--azul-boton)' : '#e2e8f0',
            color: subTab === 'produccion' ? 'white' : '#334155'
          }}
        >
          🧵 Producción de Sacos (Taller)
        </button>
        <button 
          className={subTab === 'planchado' ? 'activo' : ''} 
          onClick={() => { setSubTab('planchado'); setBusqueda(''); }}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'planchado' ? 'var(--azul-boton)' : '#e2e8f0',
            color: subTab === 'planchado' ? 'white' : '#334155'
          }}
        >
          💨 Planchado por Operario (Destajo)
        </button>
      </div>

      {subTab === 'produccion' ? (
        // ==========================================
        // VISTA: PRODUCCIÓN GENERAL
        // ==========================================
        <>
          <div className="contenedor-kpis">
            <div className="tarjeta-kpi">
              <h4>Sacos Confeccionados Hoy</h4>
              <p className="kpi-numero" style={{ color: '#2563eb' }}>{prodHoy}</p>
              <span>Total global del taller</span>
            </div>
            <div className="tarjeta-kpi kpi-amarillo">
              <h4>Sacos esta Semana</h4>
              <p className="kpi-numero" style={{ color: '#ca8a04' }}>{prodSemana}</p>
              <span>Periodo actual (Lunes a Domingo)</span>
            </div>
            <div className="tarjeta-kpi kpi-verde-claro">
              <h4>Sacos este Mes</h4>
              <p className="kpi-numero" style={{ color: '#16a34a' }}>{prodMes}</p>
              <span>Acumulado del mes actual</span>
            </div>
            <div className="tarjeta-kpi kpi-blanco">
              <h4 style={{ color: 'var(--texto-atenuado)' }}>Capacidad Confección</h4>
              <p className="kpi-numero" style={{ color: 'var(--color-texto)' }}>{producciones.length}</p>
              <span style={{ color: 'var(--texto-atenuado)' }}>Días con registros</span>
            </div>
          </div>

          <div className="barra-acciones-tabla">
            <input 
              type="text" 
              className="buscador-entrada" 
              placeholder="Buscar producción por fecha..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className="bloque-botones-derecha">
              <button className="btn-secundario" onClick={cargarDatos} disabled={cargando}>
                {cargando ? 'Cargando...' : '🔄 Actualizar'}
              </button>
              <button className="btn-primario-azul" onClick={() => setShowProdModal(true)}>
                Registrar Producción Diaria
              </button>
            </div>
          </div>

          <table className="tabla-sistema">
            <thead>
              <tr>
                <th>Fecha de Producción</th>
                <th>Sacos Confeccionados</th>
                <th>Fecha Registro</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {produccionesFiltradas.map((p) => (
                <tr key={p.id_produccion}>
                  <td style={{ fontWeight: 'bold' }}>{p.fecha}</td>
                  <td style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '15px' }}>{p.cantidad} sacos</td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{p.fecha_registro}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      style={{ 
                        padding: '6px 10px', 
                        fontSize: '11px', 
                        backgroundColor: 'rgba(220, 38, 38, 0.15)', 
                        color: '#dc2626', 
                        border: '1px solid rgba(220, 38, 38, 0.3)', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                      onClick={() => handleEliminarProd(p.id_produccion, p.fecha)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {produccionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>
                    No se encontraron registros de producción.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Modal Registro Producción General */}
          {showProdModal && (
            <div className="modal-overlay">
              <div className="modal-contenedor">
                <div className="modal-cabecera">
                  <h3>Registrar Producción del Taller</h3>
                  <button className="btn-cerrar-modal" onClick={() => setShowProdModal(false)}>&times;</button>
                </div>
                <form onSubmit={handleRegistrarProd}>
                  <div className="modal-cuerpo">
                    <div className="grupo-formulario">
                      <label>Fecha de Trabajo *</label>
                      <input 
                        type="date" 
                        value={fechaProd} 
                        onChange={(e) => setFechaProd(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label>Sacos Confeccionados en el Día *</label>
                      <input 
                        type="number" 
                        min="0" 
                        placeholder="Ej. 180" 
                        value={cantidadProd} 
                        onChange={(e) => setCantidadProd(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="modal-pie">
                    <button type="button" className="btn-cancelar" onClick={() => setShowProdModal(false)}>Cancelar</button>
                    <button type="submit" className="btn-guardar">Guardar Producción</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        // ==========================================
        // VISTA: PLANCHADO POR OPERARIO (DESTAJO)
        // ==========================================
        <>
          <div className="contenedor-kpis">
            <div className="tarjeta-kpi">
              <h4>Sacos Planchados Hoy</h4>
              <p className="kpi-numero" style={{ color: '#2563eb' }}>{planchadoHoy}</p>
              <span>Sacos listos para despacho</span>
            </div>
            <div className="tarjeta-kpi kpi-amarillo">
              <h4>Planchados esta Semana</h4>
              <p className="kpi-numero" style={{ color: '#ca8a04' }}>{planchadoSemana}</p>
              <span>Producción de planchadores</span>
            </div>
            <div className="tarjeta-kpi kpi-verde-claro">
              <h4>Planchados este Mes</h4>
              <p className="kpi-numero" style={{ color: '#16a34a' }}>{planchadoMes}</p>
              <span>Total acumulado mensual</span>
            </div>
            <div className="tarjeta-kpi kpi-blanco">
              <h4 style={{ color: 'var(--texto-atenuado)' }}>Tarifa Fija de Planchado</h4>
              <p className="kpi-numero" style={{ color: 'var(--color-texto)' }}>S/. 1.50</p>
              <span style={{ color: 'var(--texto-atenuado)' }}>Pago por saco planchado</span>
            </div>
          </div>

          <div className="barra-acciones-tabla">
            <input 
              type="text" 
              className="buscador-entrada" 
              placeholder="Buscar por planchador o fecha (AAAA-MM-DD)..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className="bloque-botones-derecha">
              <button className="btn-secundario" onClick={cargarDatos} disabled={cargando}>
                {cargando ? 'Cargando...' : '🔄 Actualizar'}
              </button>
              <button className="btn-primario-azul" onClick={() => setShowPlanchadoModal(true)}>
                Registrar Planchado Diario
              </button>
            </div>
          </div>

          <table className="tabla-sistema">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Planchador</th>
                <th style={{ textAlign: 'center' }}>Sacos Planchados</th>
                <th style={{ textAlign: 'right' }}>Tarifa por Saco</th>
                <th style={{ textAlign: 'right' }}>Total Pago (S/.)</th>
                <th>Fecha Registro</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planchadosFiltrados.map((p) => (
                <tr key={p.id_planchado}>
                  <td style={{ fontWeight: 'bold' }}>{p.fecha}</td>
                  <td style={{ fontWeight: '600', color: 'var(--color-texto)' }}>{p.planchador}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#2563eb', fontSize: '15px' }}>{p.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>S/. {parseFloat(p.tarifa_por_saco).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>S/. {parseFloat(p.total_pago).toFixed(2)}</td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{p.fecha_registro}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      style={{ 
                        padding: '6px 10px', 
                        fontSize: '11px', 
                        backgroundColor: 'rgba(220, 38, 38, 0.15)', 
                        color: '#dc2626', 
                        border: '1px solid rgba(220, 38, 38, 0.3)', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                      onClick={() => handleEliminarPlanchado(p.id_planchado, p.planchador, p.fecha)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {planchadosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>
                    No se encontraron registros de planchado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Modal Registro Planchado por Trabajador */}
          {showPlanchadoModal && (
            <div className="modal-overlay">
              <div className="modal-contenedor">
                <div className="modal-cabecera">
                  <h3>Registrar Planchado por Operario</h3>
                  <button className="btn-cerrar-modal" onClick={() => setShowPlanchadoModal(false)}>&times;</button>
                </div>
                <form onSubmit={handleRegistrarPlanchado}>
                  <div className="modal-cuerpo">
                    <div className="grupo-formulario">
                      <label>Fecha de Trabajo *</label>
                      <input 
                        type="date" 
                        value={fechaPlanchado} 
                        onChange={(e) => setFechaPlanchado(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label>Planchador Responsable *</label>
                      <select value={trabajadorId} onChange={(e) => setTrabajadorId(e.target.value)} required>
                        {trabajadores.map(t => (
                          <option key={t.id_trabajador} value={t.id_trabajador}>
                            {t.nombres} {t.apellidos} (DNI: {t.dni})
                          </option>
                        ))}
                        {trabajadores.length === 0 && (
                          <option value="">No hay planchadores registrados</option>
                        )}
                      </select>
                    </div>
                    <div className="grupo-formulario-fila">
                      <div className="grupo-formulario">
                        <label>Cantidad de Sacos *</label>
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="Ej. 65" 
                          value={cantidadPlanchado} 
                          onChange={(e) => setCantidadPlanchado(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="grupo-formulario">
                        <label>Tarifa Fija *</label>
                        <input 
                          type="text" 
                          value="S/. 1.50" 
                          disabled 
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(22, 163, 74, 0.08)', borderRadius: '6px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                      <span style={{ fontSize: '13px', color: '#166534', fontWeight: 'bold' }}>
                        Pago Calculado: S/. {((parseInt(cantidadPlanchado) || 0) * 1.50).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="modal-pie">
                    <button type="button" className="btn-cancelar" onClick={() => setShowPlanchadoModal(false)}>Cancelar</button>
                    <button type="submit" className="btn-guardar" disabled={trabajadores.length === 0}>Guardar Registro</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Produccion;
