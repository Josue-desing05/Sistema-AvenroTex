import { useState, useEffect } from 'react';
import axios from 'axios';
import logo from '../assets/logo.png';

function Reporte() {
  const [tipoFiltro, setTipoFiltro] = useState('mes'); // dia, semana, mes
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [consolidado, setConsolidado] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  // Estados de datos para Gráficos
  const [personalData, setPersonalData] = useState([]);
  const [planillaData, setPlanillaData] = useState([]);
  const [produccionData, setProduccionData] = useState([]);
  const [vacacionesData, setVacacionesData] = useState([]);

  // Estado de carga de gráficos
  const [cargandoGraficos, setCargandoGraficos] = useState({
    personal: false,
    planilla: false,
    produccion: false,
    vacaciones: false
  });

  // Tooltip interactivo global para cada gráfico
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '', chartId: null });

  // Auxiliares de fechas
  const obtenerRangoFechas = () => {
    if (tipoFiltro === 'dia') {
      return { inicio: fechaSeleccionada, fin: fechaSeleccionada };
    } else if (tipoFiltro === 'semana') {
      const d = new Date(fechaSeleccionada + 'T00:00:00');
      const day = d.getDay(); // 0 = Dom, 1 = Lun, etc.
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMonday));
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

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

  // Cargar datos del Consolidado de Asistencias (Tabla)
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

  // Cargar datos de Personal para el Gráfico 1 (Personal por Cargo)
  const cargarPersonalGrafico = async () => {
    setCargandoGraficos(prev => ({ ...prev, personal: true }));
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/trabajadores-lista');
      if (res.data.success) {
        // Agrupar por cargo
        const cargosCount = {};
        res.data.datos.forEach(worker => {
          if (worker.estado === 'ACTIVO') {
            cargosCount[worker.cargo] = (cargosCount[worker.cargo] || 0) + 1;
          }
        });
        const chartFormatted = Object.keys(cargosCount).map(key => ({
          label: key,
          value: cargosCount[key]
        }));
        setPersonalData(chartFormatted);
      }
    } catch (err) {
      console.error("Error al cargar personal para grafico:", err);
    } finally {
      setCargandoGraficos(prev => ({ ...prev, personal: false }));
    }
  };

  // Cargar datos de Planilla para el Gráfico 3 (Salario Neto por Trabajador en el período)
  const cargarPlanillaGrafico = async () => {
    setCargandoGraficos(prev => ({ ...prev, planilla: true }));
    try {
      const res = await axios.get(`http://127.0.0.1:3000/api/admin/planilla-periodo/${mesSeleccionado}`);
      if (res.data.success) {
        const formatted = res.data.datos.map(emp => ({
          label: emp.nombre.split(' ')[0], // Solo el primer nombre
          fullName: emp.nombre,
          value: parseFloat(emp.neto.toFixed(2))
        }));
        setPlanillaData(formatted);
      }
    } catch (err) {
      console.error("Error al cargar planilla para grafico:", err);
      setPlanillaData([]);
    } finally {
      setCargandoGraficos(prev => ({ ...prev, planilla: false }));
    }
  };

  // Cargar datos de Producción para el Gráfico 4 (Evolución de Producción Diaria)
  const cargarProduccionGrafico = async () => {
    setCargandoGraficos(prev => ({ ...prev, produccion: true }));
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/produccion');
      if (res.data.success) {
        // Tomamos los últimos 10 días de producción en orden cronológico
        const rawDatos = [...res.data.datos].slice(0, 10).reverse();
        const formatted = rawDatos.map(p => ({
          label: p.fecha.slice(5), // MM-DD
          fullDate: p.fecha,
          value: p.cantidad
        }));
        setProduccionData(formatted);
      }
    } catch (err) {
      console.error("Error al cargar produccion para grafico:", err);
    } finally {
      setCargandoGraficos(prev => ({ ...prev, produccion: false }));
    }
  };

  // Cargar datos de Vacaciones para el Gráfico 5 (Días de vacaciones)
  const cargarVacacionesGrafico = async () => {
    setCargandoGraficos(prev => ({ ...prev, vacaciones: true }));
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/vacaciones-lista');
      if (res.data.success) {
        // Agrupar días solicitados por colaborador
        const vacMap = {};
        res.data.datos.forEach(v => {
          if (v.estado === 'Aprobado') {
            vacMap[v.nombre] = (vacMap[v.nombre] || 0) + v.dias;
          }
        });
        const formatted = Object.keys(vacMap).map(name => ({
          label: name.split(' ')[0], // Solo el primer nombre
          fullName: name,
          value: vacMap[name]
        }));
        setVacacionesData(formatted);
      }
    } catch (err) {
      console.error("Error al cargar vacaciones para grafico:", err);
    } finally {
      setCargandoGraficos(prev => ({ ...prev, vacaciones: false }));
    }
  };

  // Disparadores de carga
  useEffect(() => {
    cargarConsolidado();
  }, [tipoFiltro, fechaSeleccionada, mesSeleccionado]);

  useEffect(() => {
    cargarPersonalGrafico();
    cargarProduccionGrafico();
    cargarVacacionesGrafico();
  }, []);

  useEffect(() => {
    cargarPlanillaGrafico();
  }, [mesSeleccionado]);

  // Filtrado reactivo por nombre o DNI para la tabla
  const filtrados = consolidado.filter(c => 
    c.empleado.toLowerCase().includes(busqueda.toLowerCase()) || c.dni.includes(busqueda)
  );

  // Cálculos consolidados para KPIs superiores
  const totalAsistencias = filtrados.reduce((sum, item) => sum + item.asistencias, 0);
  const totalTardanzas = filtrados.reduce((sum, item) => sum + item.tardanzas, 0);
  const totalFaltas = filtrados.reduce((sum, item) => sum + item.faltas, 0);
  const totalMinutos = filtrados.reduce((sum, item) => sum + item.minutos_tardanza, 0);
  const totalVacacionesPeriodo = filtrados.reduce((sum, item) => sum + item.vacaciones, 0);

  const { inicio, fin } = obtenerRangoFechas();

  // Mostrar tooltip
  const handleMouseMove = (e, content, chartId) => {
    const card = e.currentTarget.closest('.reporte-grafico-card');
    if (card) {
      const cardRect = card.getBoundingClientRect();
      const x = e.clientX - cardRect.left;
      const y = e.clientY - cardRect.top - 40;
      setTooltip({
        visible: true,
        x,
        y,
        content,
        chartId
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // ==========================================
  // GRÁFICO 1: Personal por Cargo (Horizontal)
  // ==========================================
  const renderPersonalChart = () => {
    if (cargandoGraficos.personal) return <div style={{ color: 'var(--texto-atenuado)' }}>Cargando datos...</div>;
    if (personalData.length === 0) return <div style={{ color: 'var(--texto-atenuado)' }}>No hay datos activos</div>;

    const maxVal = Math.max(...personalData.map(d => d.value), 1);
    const rowHeight = 35;
    const chartHeight = personalData.length * rowHeight + 30;

    return (
      <svg width="100%" height={chartHeight} viewBox={`0 0 500 ${chartHeight}`} style={{ overflow: 'visible' }}>
        {personalData.map((d, i) => {
          const barWidth = (d.value / maxVal) * 280;
          const y = 15 + i * rowHeight;
          return (
            <g key={i}>
              <text x="10" y={y + 16} fill="var(--color-texto)" fontSize="11" fontWeight="600" textAnchor="start">
                {d.label}
              </text>
              <rect
                x="140"
                y={y}
                width="300"
                height="22"
                fill="var(--color-fondo)"
                rx="4"
              />
              <rect
                x="140"
                y={y}
                width={barWidth || 5}
                height="22"
                fill="#54668E"
                rx="4"
                className="chart-bar"
                onMouseMove={(e) => handleMouseMove(e, `${d.label}: ${d.value} operarios`, 'personal')}
                onMouseLeave={handleMouseLeave}
              />
              <text x={145 + barWidth} y={y + 15} fill="var(--color-texto)" fontSize="11" fontWeight="bold">
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // ==========================================
  // GRÁFICO 2: Resumen Asistencia (Donut)
  // ==========================================
  const renderAsistenciaChart = () => {
    const total = totalAsistencias + totalTardanzas + totalFaltas + totalVacacionesPeriodo;
    if (total === 0) return <div style={{ color: 'var(--texto-atenuado)' }}>Sin registros en el rango seleccionado</div>;

    const segments = [
      { label: 'Presentes (A tiempo)', value: totalAsistencias, color: '#4d7c8a' },
      { label: 'Tardanzas', value: totalTardanzas, color: '#d97706' },
      { label: 'Faltas', value: totalFaltas, color: '#dc2626' },
      { label: 'Vacaciones', value: totalVacacionesPeriodo, color: '#7c3aed' }
    ].filter(s => s.value > 0);

    const radius = 55;
    const circ = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <svg width="100%" height="150" viewBox="0 0 300 150" style={{ overflow: 'visible' }}>
          <g transform="translate(150, 75)">
            <circle cx="0" cy="0" r={radius} fill="none" stroke="var(--border-color)" strokeWidth="18" />
            {segments.map((seg, i) => {
              const pct = seg.value / total;
              const strokeLength = pct * circ;
              const strokeOffset = circ - strokeLength + accumulatedAngle;
              accumulatedAngle -= strokeLength;

              return (
                <circle
                  key={i}
                  cx="0"
                  cy="0"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="20"
                  strokeDasharray={circ}
                  strokeDashoffset={strokeOffset}
                  transform="rotate(-90)"
                  className="chart-pie-slice"
                  onMouseMove={(e) => handleMouseMove(e, `${seg.label}: ${seg.value} (${(pct * 100).toFixed(1)}%)`, 'asistencia')}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
            <text x="0" y="5" textAnchor="middle" fill="var(--color-texto)" fontSize="13" fontWeight="bold">
              Total: {total}
            </text>
          </g>
        </svg>
        <div className="grafico-leyenda">
          {segments.map((seg, i) => (
            <div key={i} className="leyenda-item">
              <span className="leyenda-color" style={{ backgroundColor: seg.color }}></span>
              <span>{seg.label} ({seg.value})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================
  // GRÁFICO 3: Salario Neto (Barras Verticales)
  // ==========================================
  const renderPlanillaChart = () => {
    if (cargandoGraficos.planilla) return <div style={{ color: 'var(--texto-atenuado)' }}>Cargando datos...</div>;
    if (planillaData.length === 0) return <div style={{ color: 'var(--texto-atenuado)' }}>Sin planillas procesadas en este mes ({mesSeleccionado})</div>;

    const maxVal = Math.max(...planillaData.map(d => d.value), 100);
    const colWidth = Math.max(30, Math.floor(400 / planillaData.length));
    const chartHeight = 180;

    return (
      <svg width="100%" height="220" viewBox="0 0 500 220" style={{ overflow: 'visible' }}>
        {/* Ejes */}
        <line x1="50" y1="180" x2="480" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />
        <line x1="50" y1="20" x2="50" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />

        {/* Marcadores Y */}
        <text x="40" y="25" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">S/.{maxVal.toFixed(0)}</text>
        <text x="40" y="100" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">S/.{(maxVal / 2).toFixed(0)}</text>
        <text x="40" y="180" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">S/.0</text>

        {planillaData.map((d, i) => {
          const barHeight = (d.value / maxVal) * 150;
          const x = 60 + i * colWidth;
          const y = 180 - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={colWidth * 0.7}
                height={barHeight || 2}
                fill="#54668E"
                rx="3"
                className="chart-bar"
                onMouseMove={(e) => handleMouseMove(e, `${d.fullName}: S/. ${d.value}`, 'planilla')}
                onMouseLeave={handleMouseLeave}
              />
              <text
                x={x + (colWidth * 0.7) / 2}
                y="195"
                fill="var(--color-texto)"
                fontSize="9"
                fontWeight="500"
                textAnchor="middle"
                transform={`rotate(-15, ${x + (colWidth * 0.7) / 2}, 195)`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // ==========================================
  // GRÁFICO 4: Producción Planta (Línea)
  // ==========================================
  const renderProduccionChart = () => {
    if (cargandoGraficos.produccion) return <div style={{ color: 'var(--texto-atenuado)' }}>Cargando datos...</div>;
    if (produccionData.length === 0) return <div style={{ color: 'var(--texto-atenuado)' }}>Sin registros de producción</div>;

    const maxVal = Math.max(...produccionData.map(d => d.value), 10);
    const stepX = 400 / (produccionData.length - 1 || 1);
    const points = produccionData.map((d, i) => ({
      x: 60 + i * stepX,
      y: 180 - (d.value / maxVal) * 140,
      label: d.label,
      fullDate: d.fullDate,
      value: d.value
    }));

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    return (
      <svg width="100%" height="220" viewBox="0 0 500 220" style={{ overflow: 'visible' }}>
        {/* Guías horizontales */}
        <line x1="50" y1="40" x2="470" y2="40" stroke="var(--border-color)" strokeDasharray="3,3" />
        <line x1="50" y1="110" x2="470" y2="110" stroke="var(--border-color)" strokeDasharray="3,3" />
        {/* Ejes */}
        <line x1="50" y1="180" x2="470" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />
        <line x1="50" y1="20" x2="50" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />

        {/* Textos de escala */}
        <text x="40" y="44" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">{maxVal} u.</text>
        <text x="40" y="114" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">{Math.round(maxVal / 2)} u.</text>
        <text x="40" y="180" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">0 u.</text>

        {/* Línea de producción */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke="#54668E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Puntos de datos */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill="#ffffff"
              stroke="#54668E"
              strokeWidth="3.5"
              className="chart-line-point"
              onMouseMove={(e) => handleMouseMove(e, `Fecha: ${p.fullDate} | Producción: ${p.value} prendas`, 'produccion')}
              onMouseLeave={handleMouseLeave}
            />
            <text x={p.x} y="195" fill="var(--color-texto)" fontSize="9.5" fontWeight="600" textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // ==========================================
  // GRÁFICO 5: Vacaciones Aprobadas (Barras)
  // ==========================================
  const renderVacacionesChart = () => {
    if (cargandoGraficos.vacaciones) return <div style={{ color: 'var(--texto-atenuado)' }}>Cargando datos...</div>;
    if (vacacionesData.length === 0) return <div style={{ color: 'var(--texto-atenuado)' }}>Sin vacaciones registradas</div>;

    const maxVal = Math.max(...vacacionesData.map(d => d.value), 5);
    const colWidth = Math.max(35, Math.floor(400 / vacacionesData.length));

    return (
      <svg width="100%" height="220" viewBox="0 0 500 220" style={{ overflow: 'visible' }}>
        <line x1="50" y1="180" x2="480" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />
        <line x1="50" y1="20" x2="50" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />

        <text x="40" y="25" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">{maxVal} días</text>
        <text x="40" y="100" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">{Math.round(maxVal / 2)} días</text>
        <text x="40" y="180" fill="var(--texto-atenuado)" fontSize="9" textAnchor="end">0</text>

        {vacacionesData.map((d, i) => {
          const barHeight = (d.value / maxVal) * 150;
          const x = 60 + i * colWidth;
          const y = 180 - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={colWidth * 0.7}
                height={barHeight || 2}
                fill="#7c3aed"
                rx="3"
                className="chart-bar"
                onMouseMove={(e) => handleMouseMove(e, `${d.fullName}: ${d.value} días de vacaciones`, 'vacaciones')}
                onMouseLeave={handleMouseLeave}
              />
              <text
                x={x + (colWidth * 0.7) / 2}
                y="195"
                fill="var(--color-texto)"
                fontSize="9"
                fontWeight="500"
                textAnchor="middle"
                transform={`rotate(-15, ${x + (colWidth * 0.7) / 2}, 195)`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="modulo-contenido">
      {/* Controles de Rango Temporal */}
      <div className="barra-planilla-cierre" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          
          <div className="selector-frecuencia" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--texto-atenuado)' }}>Frecuencia de Vista:</label>
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
              <label style={{ marginRight: '8px', fontSize: '13px', color: 'var(--texto-atenuado)' }}>Selecciona el día:</label>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
            </div>
          )}

          {tipoFiltro === 'semana' && (
            <div className="selector-mes" style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '8px', fontSize: '13px', color: 'var(--texto-atenuado)' }}>Selecciona fecha de semana:</label>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
            </div>
          )}

          {tipoFiltro === 'mes' && (
            <div className="selector-mes" style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '8px', fontSize: '13px', color: 'var(--texto-atenuado)' }}>Selecciona el mes:</label>
              <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} />
            </div>
          )}

        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-texto)', fontWeight: 'bold' }}>
          Rango evaluado: <span style={{ color: 'var(--color-primario)' }}>{inicio}</span> al <span style={{ color: 'var(--color-primario)' }}>{fin}</span>
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

      {/* Panel de Gráficos de los Otros 5 Módulos */}
      <div className="reporte-dashboard-container">
        <h2 style={{ fontSize: '18px', textAlign: 'left', margin: '15px 0 5px 0', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
          📊 Dashboard Ejecutivo de Reportes
        </h2>
        <div className="reporte-dashboard-grid">
          
          {/* Gráfico 1: Personal (Personal por Cargo) */}
          <div className="reporte-grafico-card">
            <h3>1. Distribución de Personal por Cargo</h3>
            <div className="reporte-grafico-content">
              {renderPersonalChart()}
            </div>
            {tooltip.visible && tooltip.chartId === 'personal' && (
              <div className="grafico-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                {tooltip.content}
              </div>
            )}
          </div>

          {/* Gráfico 2: Asistencia (Estado de Asistencia en Rango) */}
          <div className="reporte-grafico-card">
            <h3>2. Resumen de Asistencia del Período</h3>
            <div className="reporte-grafico-content">
              {renderAsistenciaChart()}
            </div>
            {tooltip.visible && tooltip.chartId === 'asistencia' && (
              <div className="grafico-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                {tooltip.content}
              </div>
            )}
          </div>

          {/* Gráfico 3: Planilla (Salario Neto del Mes) */}
          <div className="reporte-grafico-card">
            <h3>3. Salario Neto por Trabajador ({mesSeleccionado})</h3>
            <div className="reporte-grafico-content">
              {renderPlanillaChart()}
            </div>
            {tooltip.visible && tooltip.chartId === 'planilla' && (
              <div className="grafico-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                {tooltip.content}
              </div>
            )}
          </div>

          {/* Gráfico 4: Producción (Línea de Producción Planta) */}
          <div className="reporte-grafico-card">
            <h3>4. Evolución de Producción Diaria (Últimos 10 registros)</h3>
            <div className="reporte-grafico-content">
              {renderProduccionChart()}
            </div>
            {tooltip.visible && tooltip.chartId === 'produccion' && (
              <div className="grafico-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                {tooltip.content}
              </div>
            )}
          </div>

          {/* Gráfico 5: Vacaciones (Días de vacaciones) - Ocupa ancho completo */}
          <div className="reporte-grafico-card completo">
            <h3>5. Días de Vacaciones Aprobadas por Colaborador</h3>
            <div className="reporte-grafico-content">
              {renderVacacionesChart()}
            </div>
            {tooltip.visible && tooltip.chartId === 'vacaciones' && (
              <div className="grafico-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                {tooltip.content}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Barra de Acciones y Tabla */}
      <h2 style={{ fontSize: '18px', textAlign: 'left', margin: '25px 0 5px 0', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
        📋 Detalles de Asistencia Consolidada
      </h2>
      <div className="barra-acciones-tabla" style={{ marginTop: '15px' }}>
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

export default Reporte;
