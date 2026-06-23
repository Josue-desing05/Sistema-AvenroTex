import { useState, useEffect } from 'react';
import axios from 'axios';

function ConsolidadoAsistencia() {
  const [tipoFiltro, setTipoFiltro] = useState('mes'); // dia, semana, mes
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [consolidado, setConsolidado] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  // Auxiliares de fechas
  const obtenerRangoFechas = () => {
    if (tipoFiltro === 'dia') {
      return { inicio: fechaSeleccionada, fin: fechaSeleccionada };
    } else if (tipoFiltro === 'semana') {
      const d = new Date(fechaSeleccionada + 'T00:00:00');
      const day = d.getDay(); // 0 = Dom, 1 = Lun, etc.
      // Calcular diferencia para Lunes (1)
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMonday));
      
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5); // Lunes + 5 = Sábado

      return {
        inicio: monday.toISOString().split('T')[0],
        fin: saturday.toISOString().split('T')[0]
      };
    } else {
      // Mes
      const [year, month] = mesSeleccionado.split('-');
      const firstDay = `${year}-${month}-01`;
      const lastDayObj = new Date(parseInt(year), parseInt(month), 0);
      const lastDay = `${year}-${month}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
      return {
        inicio: firstDay,
        fin: lastDay
      };
    }
  };

  const cargarConsolidado = async () => {
    setCargando(true);
    const { inicio, fin } = obtenerRangoFechas();
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/asistencias-consolidado', {
        params: { fechaInicio: inicio, fechaFin: fin }
      });
      if (res.data.success) {
        setConsolidado(res.data.datos);
      }
    } catch (err) {
      console.error("Error al cargar consolidado:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarConsolidado();
  }, [tipoFiltro, fechaSeleccionada, mesSeleccionado]);

  // Filtrado reactivo por nombre o DNI
  const filtrados = consolidado.filter(c => 
    c.empleado.toLowerCase().includes(busqueda.toLowerCase()) || c.dni.includes(busqueda)
  );

  // Cálculos consolidados para KPIs superiores
  const totalAsistencias = filtrados.reduce((sum, item) => sum + item.asistencias, 0);
  const totalTardanzas = filtrados.reduce((sum, item) => sum + item.tardanzas, 0);
  const totalFaltas = filtrados.reduce((sum, item) => sum + item.faltas, 0);
  const totalMinutos = filtrados.reduce((sum, item) => sum + item.minutos_tardanza, 0);

  const { inicio, fin } = obtenerRangoFechas();

  return (
    <div className="modulo-contenido">
      {/* Controles de Rango Temporal */}
      <div className="barra-planilla-cierre" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          
          <div className="selector-frecuencia" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#64748b' }}>Frecuencia de Vista:</label>
            <select 
              value={tipoFiltro} 
              onChange={(e) => setTipoFiltro(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-paneles)',
                border: '1px solid var(--border-color)',
                color: 'var(--color-texto)',
                cursor: 'pointer'
              }}
            >
              <option value="dia">Vista Diaria (Día específico)</option>
              <option value="semana">Vista Semanal (Lunes a Sábado)</option>
              <option value="mes">Vista Mensual (Mes completo)</option>
            </select>
          </div>

          {tipoFiltro === 'dia' && (
            <div className="selector-mes" style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '8px', fontSize: '13px', color: '#64748b' }}>Selecciona el día:</label>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
            </div>
          )}

          {tipoFiltro === 'semana' && (
            <div className="selector-mes" style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '8px', fontSize: '13px', color: '#64748b' }}>Selecciona fecha de semana:</label>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
            </div>
          )}

          {tipoFiltro === 'mes' && (
            <div className="selector-mes" style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '8px', fontSize: '13px', color: '#64748b' }}>Selecciona el mes:</label>
              <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} />
            </div>
          )}

        </div>
        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
          Rango evaluado: <span style={{ color: '#2563eb' }}>{inicio}</span> al <span style={{ color: '#2563eb' }}>{fin}</span>
        </div>
      </div>

      {/* KPIs Consolidados */}
      <div className="contenedor-kpis">
        <div className="tarjeta-kpi">
          <h4>Asistencias Registradas</h4>
          <p className="kpi-numero" style={{ color: '#16a34a' }}>{totalAsistencias}</p>
          <span>Días marcados con entrada</span>
        </div>
        <div className="tarjeta-kpi kpi-amarillo">
          <h4>Tardanzas Totales</h4>
          <p className="kpi-numero" style={{ color: '#ca8a04' }}>{totalTardanzas}</p>
          <span>Minutos de demora: {totalMinutos} min</span>
        </div>
        <div className="tarjeta-kpi kpi-rojo">
          <h4>Faltas Detectadas</h4>
          <p className="kpi-numero" style={{ color: '#dc2626' }}>{totalFaltas}</p>
          <span>Días sin marca laboral</span>
        </div>
        <div className="tarjeta-kpi">
          <h4>Días Laborables</h4>
          <p className="kpi-numero">{consolidado[0]?.dias_laborables || 0}</p>
          <span>Periodo (Lunes a Sábado)</span>
        </div>
      </div>

      {/* Barra de Acciones */}
      <div className="barra-acciones-tabla">
        <input 
          type="text" 
          className="buscador-entrada" 
          placeholder="Buscar por operario o DNI..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="btn-secundario" onClick={cargarConsolidado} disabled={cargando}>
          {cargando ? 'Cargando...' : '🔄 Actualizar Reporte'}
        </button>
      </div>

      {/* Tabla Consolidada */}
      <table className="tabla-sistema">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Trabajador</th>
            <th>Cargo</th>
            <th style={{ textAlign: 'center' }}>Asistencias</th>
            <th style={{ textAlign: 'center' }}>Tardanzas (minutos)</th>
            <th style={{ textAlign: 'center' }}>Justificaciones</th>
            <th style={{ textAlign: 'center' }}>Vacaciones (días)</th>
            <th style={{ textAlign: 'center' }}>Faltas</th>
            <th style={{ textAlign: 'center' }}>Porcentaje Asist.</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((c) => {
            const porcentaje = c.dias_laborables > 0 
              ? ((c.asistencias + c.vacaciones) / c.dias_laborables * 100).toFixed(0) 
              : '100';

            return (
              <tr key={c.id_trabajador}>
                <td>{c.dni}</td>
                <td style={{ fontWeight: '600', color: 'var(--color-texto)' }}>{c.empleado}</td>
                <td><span className={`badge cargo-${c.cargo.toLowerCase()}`}>{c.cargo}</span></td>
                <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 'bold' }}>{c.asistencias} / {c.dias_laborables}</td>
                <td style={{ textAlign: 'center' }}>
                  {c.tardanzas > 0 ? (
                    <span style={{ color: '#ca8a04', fontWeight: 'bold' }}>
                      {c.tardanzas} ({c.minutos_tardanza}m)
                    </span>
                  ) : '0'}
                </td>
                <td style={{ textAlign: 'center', color: '#2563eb' }}>{c.justificaciones}</td>
                <td style={{ textAlign: 'center', color: '#7c3aed' }}>{c.vacaciones}</td>
                <td style={{ textAlign: 'center', color: c.faltas > 0 ? '#dc2626' : 'inherit', fontWeight: c.faltas > 0 ? 'bold' : 'normal' }}>
                  {c.faltas}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  <span style={{ color: parseInt(porcentaje) >= 90 ? '#16a34a' : (parseInt(porcentaje) >= 75 ? '#ca8a04' : '#dc2626') }}>
                    {porcentaje}%
                  </span>
                </td>
              </tr>
            );
          })}
          {filtrados.length === 0 && (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', color: '#64748b' }}>
                {cargando ? 'Cargando datos del servidor...' : 'No se encontraron registros de personal para el rango seleccionado.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ConsolidadoAsistencia;
