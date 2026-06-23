import { useState, useEffect } from 'react';
import axios from 'axios';

function Vacaciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Modales y formularios
  const [showModal, setShowModal] = useState(false);
  const [trabajadores, setTrabajadores] = useState([]);
  const [trabajadorId, setTrabajadorId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);

  const cargarVacaciones = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/vacaciones-lista');
      if (res.data.success) setSolicitudes(res.data.datos);
    } catch (err) {
      console.error("Error al conectar vacaciones:", err);
    }
  };

  const cargarTrabajadores = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/trabajadores-lista');
      if (res.data.success) {
        setTrabajadores(res.data.datos);
        if (res.data.datos.length > 0) {
          setTrabajadorId(res.data.datos[0].id_trabajador.toString());
        }
      }
    } catch (err) {
      console.error("Error al cargar trabajadores:", err);
    }
  };

  useEffect(() => {
    (async () => {
      await cargarVacaciones();
      await cargarTrabajadores();
    })();
  }, []);

  const handleProgramar = async (e) => {
    e.preventDefault();
    if (!trabajadorId || !fechaInicio || !fechaFin) {
      alert("Por favor complete todos los campos.");
      return;
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      alert("La fecha de fin no puede ser anterior a la fecha de inicio.");
      return;
    }
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/admin/vacaciones', {
        id_trabajador: parseInt(trabajadorId),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      });
      if (res.data.success) {
        alert("¡Vacaciones programadas exitosamente!");
        setShowModal(false);
        await cargarVacaciones();
      }
    } catch (err) {
      alert("Error al programar vacaciones: " + (err.response?.data?.error || err.message));
    }
  };

  // Filtrado reactivo por nombre
  const filtrados = solicitudes.filter(v => 
    v.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const pendientes = solicitudes.filter(v => v.estado?.toLowerCase() === 'pendiente').length;
  const aprobadas = solicitudes.filter(v => v.estado?.toLowerCase() === 'aprobado').length;

  return (
    <div className="modulo-contenido">
      <div className="contenedor-kpis">
        <div className="tarjeta-kpi kpi-amarillo">
          <h4>Solicitudes Pendientes</h4>
          <p className="kpi-numero">{pendientes}</p>
          <span>Requieren revisión</span>
        </div>
        <div className="tarjeta-kpi">
          <h4>Próximas Vacaciones</h4>
          <p className="kpi-numero">{aprobadas}</p>
          <span>Aprobadas y programadas</span>
        </div>
        <div className="tarjeta-kpi">
          <h4>Personal Elegible</h4>
          <p className="kpi-numero">{solicitudes.length}</p>
          <span>Trabajadores en historial</span>
        </div>
      </div>

      <div className="barra-acciones-tabla">
        <input 
          type="text" 
          className="buscador-entrada" 
          placeholder="Buscar por nombre del trabajador..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="btn-primario-azul" onClick={() => setShowModal(true)}>Programar Descanso</button>
      </div>

      <table className="tabla-sistema">
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Subárea</th>
            <th>Fecha Inicio</th>
            <th>Fecha Fin</th>
            <th>Días Netos</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((v, i) => (
            <tr key={i}>
              <td style={{ fontWeight: '600', color: 'var(--color-texto)' }}>{v.nombre}</td>
              <td>{v.subarea}</td>
              <td>{v.inicio}</td>
              <td>{v.fin}</td>
              <td style={{ fontWeight: 'bold' }}>{v.dias}</td>
              <td>
                <span className={`badge estado-${v.estado?.toLowerCase()}`}>{v.estado}</span>
              </td>
              <td><button className="btn-accion-tabla">•••</button></td>
            </tr>
          ))}
          {filtrados.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>No hay vacaciones programadas en el sistema.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal Programar Descanso */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-contenedor">
            <div className="modal-cabecera">
              <h3>Programar Vacaciones</h3>
              <button className="btn-cerrar-modal" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleProgramar}>
              <div className="modal-cuerpo">
                <div className="grupo-formulario">
                  <label>Trabajador *</label>
                  <select value={trabajadorId} onChange={(e) => setTrabajadorId(e.target.value)} required>
                    {trabajadores.map(t => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} {t.apellidos} (DNI: {t.dni})</option>
                    ))}
                  </select>
                </div>

                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>Fecha de Inicio *</label>
                    <input 
                      type="date" 
                      value={fechaInicio} 
                      onChange={(e) => setFechaInicio(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label>Fecha de Fin *</label>
                    <input 
                      type="date" 
                      value={fechaFin} 
                      onChange={(e) => setFechaFin(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-pie">
                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar">Programar Descanso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vacaciones;