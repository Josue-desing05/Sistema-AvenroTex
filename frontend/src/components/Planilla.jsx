import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function Planilla() {
  const [periodo, setPeriodo] = useState('2026-06');
  const [frecuencia, setFrecuencia] = useState('semanal'); // semanal, mensual
  const [datosPlanilla, setDatosPlanilla] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);

  // Estados para modal de boleta
  const [showBoletaModal, setShowBoletaModal] = useState(false);
  const [selectedBoleta, setSelectedBoleta] = useState(null);

  const calcularPlanillaBD = useCallback(async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:3000/api/admin/planilla-periodo/${periodo}`);
      if (res.data.success) setDatosPlanilla(res.data.datos);
    } catch (err) {
      console.error("Error en cálculos de planilla:", err);
    }
  }, [periodo]);

  const cargarTrabajadores = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/trabajadores-lista');
      if (res.data.success) setTrabajadores(res.data.datos);
    } catch (err) {
      console.error("Error al cargar trabajadores:", err);
    }
  };

  useEffect(() => {
    (async () => {
      await calcularPlanillaBD();
      await cargarTrabajadores();
    })();
  }, [calcularPlanillaBD]);

  // Sumatorias en tiempo real (Base Mensual Completa)
  const totalBrutoMensual = datosPlanilla.reduce((sum, p) => sum + (p.sueldo + p.asigFam + p.hExtras), 0);
  const totalRetencionesMensual = datosPlanilla.reduce((sum, p) => sum + p.retenciones, 0);
  const totalNetoMensual = datosPlanilla.reduce((sum, p) => sum + p.neto, 0);
  const costoEsSaludMensual = totalBrutoMensual * 0.09;

  // Factor de escala
  const factor = frecuencia === 'semanal' ? 4 : 1;
  const totalBruto = totalBrutoMensual / factor;
  const totalRetenciones = totalRetencionesMensual / factor;
  const totalNeto = totalNetoMensual / factor;
  const totalCostoLaboral = (totalBrutoMensual + costoEsSaludMensual) / factor;

  const abrirBoleta = (p) => {
    setSelectedBoleta(p);
    setShowBoletaModal(true);
  };

  return (
    <div className="modulo-contenido">
      <div className="barra-planilla-cierre" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div className="selector-mes">
            <label style={{ marginRight: '8px', fontSize: '13px', color: '#64748b' }}>Periodo a procesar:</label>
            <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </div>
          <div className="selector-frecuencia" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#64748b' }}>Frecuencia de Pago:</label>
            <select 
              value={frecuencia} 
              onChange={(e) => setFrecuencia(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-paneles)',
                border: '1px solid var(--border-color)',
                color: 'var(--color-texto)',
                cursor: 'pointer'
              }}
            >
              <option value="semanal">Semanal (Pago Frecuente)</option>
              <option value="mensual">Mensual (Cierre completo)</option>
            </select>
          </div>
        </div>
        <button className="btn-primario-azul">Ejecutar Cierre {frecuencia === 'semanal' ? 'Semanal' : 'Mensual'}</button>
      </div>

      <div className="contenedor-kpis">
        <div className="tarjeta-kpi">
          <h4>Total Remuneración Bruta ({frecuencia === 'semanal' ? 'Semanal' : 'Mensual'})</h4>
          <p className="kpi-numero">S/. {totalBruto.toFixed(2)}</p>
          <span>Sueldos + Bonos + H.E.</span>
        </div>
        <div className="tarjeta-kpi kpi-rojo-claro">
          <h4>Retenciones (AFP - {frecuencia === 'semanal' ? 'Semanal' : 'Mensual'})</h4>
          <p className="kpi-numero" style={{ color: '#ef4444' }}>S/. {Math.abs(totalRetenciones).toFixed(2)}</p>
          <span>Fondo de pensiones AFP</span>
        </div>
        <div className="tarjeta-kpi kpi-verde-claro">
          <h4>Neto a Transferir ({frecuencia === 'semanal' ? 'Semanal' : 'Mensual'})</h4>
          <p className="kpi-numero" style={{ color: '#16a34a' }}>S/. {totalNeto.toFixed(2)}</p>
          <span>Cuentas sueldo operarios</span>
        </div>
        <div className="tarjeta-kpi kpi-blanco">
          <h4 style={{ color: 'var(--texto-atenuado)' }}>Costo Laboral ({frecuencia === 'semanal' ? 'Semanal' : 'Mensual'})</h4>
          <p className="kpi-numero" style={{ color: 'var(--color-texto)' }}>S/. {totalCostoLaboral.toFixed(2)}</p>
          <span style={{ color: 'var(--texto-atenuado)' }}>Bruto + Aporte EsSalud (9%)</span>
        </div>
      </div>

      <table className="tabla-sistema">
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Sueldo Base</th>
            <th>Asig. Fam.</th>
            <th>H. Extras</th>
            <th>Bruto Total</th>
            <th>Retención AFP</th>
            <th>Neto a Pagar</th>
            <th>Boleta</th>
          </tr>
        </thead>
        <tbody>
          {datosPlanilla.map((p, idx) => {
            const empSueldo = p.sueldo / factor;
            const empAsigFam = p.asigFam / factor;
            const empHExtras = p.hExtras / factor;
            const empBruto = empSueldo + empAsigFam + empHExtras;
            const empRetencion = p.retenciones / factor;
            const empNeto = p.neto / factor;

            return (
              <tr key={idx}>
                <td>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-texto)' }}>{p.nombre}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{p.regimen}</div>
                </td>
                <td>S/. {empSueldo.toFixed(2)}</td>
                <td>S/. {empAsigFam.toFixed(2)}</td>
                <td>S/. {empHExtras.toFixed(2)}</td>
                <td style={{ fontWeight: '600' }}>S/. {empBruto.toFixed(2)}</td>
                <td style={{ color: '#ef4444' }}>S/. {empRetencion.toFixed(2)}</td>
                <td style={{ color: '#16a34a', fontWeight: 'bold' }}>S/. {empNeto.toFixed(2)}</td>
                <td>
                  <button className="btn-boleta-pdf" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => abrirBoleta(p)}>
                    📄 PDF
                  </button>
                </td>
              </tr>
            );
          })}
          {datosPlanilla.length === 0 && (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', color: '#64748b' }}>No hay trabajadores con contratos activos registrados para este periodo.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal Generar Boleta de Pago */}
      {showBoletaModal && selectedBoleta && (() => {
        const infoTrab = trabajadores.find(t => (t.nombres + ' ' + t.apellidos) === selectedBoleta.nombre);
        const empSueldo = selectedBoleta.sueldo / factor;
        const empAsigFam = selectedBoleta.asigFam / factor;
        const empHExtras = selectedBoleta.hExtras / factor;
        const empBruto = empSueldo + empAsigFam + empHExtras;
        const empRetencion = Math.abs(selectedBoleta.retenciones / factor);
        const empNeto = selectedBoleta.neto / factor;
        
        return (
          <div className="modal-overlay">
            <div className="modal-contenedor" style={{ width: '600px' }}>
              <div className="modal-cabecera">
                <h3>Generar Boleta de Pago</h3>
                <button className="btn-cerrar-modal" onClick={() => setShowBoletaModal(false)}>&times;</button>
              </div>
              <div className="modal-cuerpo">
                <div id="boleta-impresion" style={{ padding: '20px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000', fontFamily: 'Courier New, monospace' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', textTransform: 'uppercase' }}>AVENROTEX S.A.C.</h3>
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>R.U.C. N° 20608923456</p>
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>Taller principal de Confecciones</p>
                    <h4 style={{ margin: '10px 0 2px 0', fontSize: '13px', textTransform: 'uppercase', textDecoration: 'underline' }}>BOLETA DE PAGO - FRECUENCIA {frecuencia.toUpperCase()}</h4>
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>Periodo: {periodo}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', borderBottom: '1px solid #000', paddingBottom: '12px', marginBottom: '15px' }}>
                    <div>
                      <p style={{ margin: '2px 0' }}><strong>TRABAJADOR:</strong> {selectedBoleta.nombre}</p>
                      <p style={{ margin: '2px 0' }}><strong>D.N.I.:</strong> {infoTrab?.dni || '—'}</p>
                      <p style={{ margin: '2px 0' }}><strong>RÉGIMEN PENS.:</strong> {selectedBoleta.regimen}</p>
                    </div>
                    <div>
                      <p style={{ margin: '2px 0' }}><strong>CARGO / ROL:</strong> {infoTrab?.cargo || 'Operario'}</p>
                      <p style={{ margin: '2px 0' }}><strong>ESTADO:</strong> Activo</p>
                      <p style={{ margin: '2px 0' }}><strong>MONEDA:</strong> Soles (S/.)</p>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}>DESCRIPCIÓN DE CONCEPTOS</th>
                        <th style={{ textAlign: 'right', padding: '4px 0' }}>INGRESOS</th>
                        <th style={{ textAlign: 'right', padding: '4px 0' }}>DESCUENTOS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0' }}>Sueldo Base pactado</td>
                        <td style={{ textAlign: 'right', padding: '4px 0' }}>S/. {empSueldo.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '4px 0' }}>—</td>
                      </tr>
                      {empAsigFam > 0 && (
                        <tr>
                          <td style={{ padding: '4px 0' }}>Asignación Familiar (Ley 25129)</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>S/. {empAsigFam.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>—</td>
                        </tr>
                      )}
                      {empHExtras > 0 && (
                        <tr>
                          <td style={{ padding: '4px 0' }}>Horas Extras calc.</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>S/. {empHExtras.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>—</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: '4px 0', color: '#000' }}>Retención obligatoria AFP</td>
                        <td style={{ textAlign: 'right', padding: '4px 0' }}>—</td>
                        <td style={{ textAlign: 'right', padding: '4px 0', color: '#000' }}>S/. {empRetencion.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
                    <span>TOTAL BRUTO: S/. {empBruto.toFixed(2)}</span>
                    <span>TOTAL RETENCIONES: S/. {empRetencion.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', padding: '4px 0', backgroundColor: '#f1f5f9', border: '1px solid #000' }}>
                    <span style={{ marginLeft: '6px' }}>NETO A PAGAR:</span>
                    <span style={{ marginRight: '6px' }}>S/. {empNeto.toFixed(2)}</span>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '9px', color: '#555' }}>
                    <p style={{ margin: '2px 0' }}>* Aporte Empleador (EsSalud 9%): S/. {(empBruto * 0.09).toFixed(2)}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '50px', textAlign: 'center', fontSize: '10px' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '6px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>AVENROTEX S.A.C.</p>
                      <p style={{ margin: 0 }}>Empleador</p>
                    </div>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '6px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedBoleta.nombre}</p>
                      <p style={{ margin: 0 }}>Firma del Trabajador</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-pie">
                <button type="button" className="btn-cancelar" onClick={() => setShowBoletaModal(false)}>Cerrar</button>
                <button type="button" className="btn-guardar" onClick={() => {
                  const printContent = document.getElementById('boleta-impresion').innerHTML;
                  const originalContent = document.body.innerHTML;
                  
                  // Crear una ventana o elemento temporal para imprimir de manera limpia
                  const win = window.open('', '', 'height=600,width=800');
                  win.document.write('<html><head><title>Imprimir Boleta - AvenroTex</title>');
                  win.document.write('</head><body style="padding: 20px;">');
                  win.document.write(printContent);
                  win.document.write('</body></html>');
                  win.document.close();
                  win.print();
                  win.close();
                }}>Imprimir Boleta</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Planilla;