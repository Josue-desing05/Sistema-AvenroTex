import { useState, useEffect } from 'react';
import axios from 'axios';

function Personal() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Estados para el modal y formulario
  const [showModal, setShowModal] = useState(false);
  const [cargos, setCargos] = useState([]);
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [pin, setPin] = useState('');
  const [idCargo, setIdCargo] = useState('1');
  const [sueldoBase, setSueldoBase] = useState('1025');
  const [asigFam, setAsigFam] = useState(false);

  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editDni, setEditDni] = useState('');
  const [editNombres, setEditNombres] = useState('');
  const [editApellidos, setEditApellidos] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editIdCargo, setEditIdCargo] = useState('1');
  const [editSueldoBase, setEditSueldoBase] = useState('1025');
  const [editAsigFam, setEditAsigFam] = useState(false);

  const cargoSeleccionado = cargos.find(c => c.id_cargo.toString() === idCargo);
  const esPlanchador = cargoSeleccionado?.nombre_cargo === 'Planchador';

  const cargarTrabajadores = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/trabajadores-lista');
      if (res.data.success) {
        setTrabajadores(res.data.datos);
      }
    } catch (err) {
      console.error("Error al conectar con la maestra de SQL Server:", err.message);
    }
  };

  const cargarCargos = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/admin/cargos');
      if (res.data.success) {
        setCargos(res.data.datos);
        if (res.data.datos.length > 0) {
          setIdCargo(res.data.datos[0].id_cargo.toString());
        }
      }
    } catch (err) {
      console.error("Error al obtener cargos:", err.message);
    }
  };

  useEffect(() => {
    (async () => {
      await cargarTrabajadores();
      await cargarCargos();
    })();
  }, []);

  // Filtrado en tiempo real por DNI o Nombre
  const filtrados = trabajadores.filter(t =>
    (t.nombres + ' ' + t.apellidos).toLowerCase().includes(busqueda.toLowerCase()) || t.dni.includes(busqueda)
  );

  // Cálculos dinámicos para los KPIs basados en tu captura
  const totalActivos = trabajadores.length;
  const costureras = trabajadores.filter(t => t.cargo?.toLowerCase() === 'costurera').length;
  const cortadores = trabajadores.filter(t => t.cargo?.toLowerCase() === 'cortador').length;
  const planchadores = trabajadores.filter(t => t.cargo?.toLowerCase() === 'planchador').length;

  const handleRegistrar = async (e) => {
    e.preventDefault();
    if (!dni || !nombres || !apellidos || !pin) {
      alert("Por favor, complete todos los campos obligatorios (DNI, Nombres, Apellidos, PIN).");
      return;
    }
    if (dni.length !== 8) {
      alert("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    if (pin.length !== 8) {
      alert("El PIN debe tener exactamente 8 dígitos.");
      return;
    }
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/admin/trabajadores', {
        dni,
        nombres,
        apellidos,
        pin,
        id_cargo: parseInt(idCargo),
        sueldo_base: esPlanchador ? 0.00 : parseFloat(sueldoBase),
        asignacion_familiar: asigFam
      });
      if (res.data.success) {
        alert("¡Trabajador registrado exitosamente!");
        setShowModal(false);
        // Limpiar campos
        setDni('');
        setNombres('');
        setApellidos('');
        setPin('');
        setIdCargo(cargos[0]?.id_cargo.toString() || '1');
        setSueldoBase('1025');
        setAsigFam(false);
        // Recargar tabla
        await cargarTrabajadores();
      }
    } catch (err) {
      alert("Error al registrar trabajador: " + (err.response?.data?.error || err.message));
    }
  };

  const handleAbrirEditar = (t) => {
    setEditId(t.id_trabajador);
    setEditDni(t.dni.trim());
    setEditNombres(t.nombres);
    setEditApellidos(t.apellidos);
    setEditPin(t.pin_seguridad || '');
    const cargoObj = cargos.find(c => c.nombre_cargo === t.cargo);
    setEditIdCargo(cargoObj ? cargoObj.id_cargo.toString() : '1');
    setEditSueldoBase(t.sueldo_base !== null && t.sueldo_base !== undefined ? t.sueldo_base.toString() : '1025');
    setEditAsigFam(!!t.asignacion_familiar);
    setShowEditModal(true);
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!editDni || !editNombres || !editApellidos || !editPin) {
      alert("Por favor, complete todos los campos obligatorios (DNI, Nombres, Apellidos, PIN).");
      return;
    }
    if (editDni.length !== 8) {
      alert("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    if (editPin.length !== 8) {
      alert("El PIN debe tener exactamente 8 dígitos.");
      return;
    }

    const cargoSeleccionadoEdit = cargos.find(c => c.id_cargo.toString() === editIdCargo);
    const esPlanchadorEdit = cargoSeleccionadoEdit?.nombre_cargo === 'Planchador';

    try {
      const res = await axios.put(`http://127.0.0.1:3000/api/admin/trabajadores/${editId}`, {
        dni: editDni,
        nombres: editNombres,
        apellidos: editApellidos,
        pin: editPin,
        id_cargo: parseInt(editIdCargo),
        sueldo_base: esPlanchadorEdit ? 0.00 : parseFloat(editSueldoBase),
        asignacion_familiar: editAsigFam
      });
      if (res.data.success) {
        alert("¡Trabajador actualizado exitosamente!");
        setShowEditModal(false);
        await cargarTrabajadores();
      }
    } catch (err) {
      alert("Error al actualizar trabajador: " + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleEstado = async (id) => {
    try {
      const res = await axios.put(`http://127.0.0.1:3000/api/admin/trabajadores/${id}/toggle-estado`);
      if (res.data.success) {
        alert(res.data.message);
        await cargarTrabajadores();
      }
    } catch (err) {
      alert("Error al cambiar estado del trabajador: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEliminar = async (id, nombreCompleto) => {
    if (window.confirm(`¿Está seguro de que desea eliminar al trabajador ${nombreCompleto}? Esto borrará también todo su historial de asistencia, contratos y vacaciones de manera permanente.`)) {
      try {
        const res = await axios.delete(`http://127.0.0.1:3000/api/admin/trabajadores/${id}`);
        if (res.data.success) {
          alert(res.data.message);
          await cargarTrabajadores();
        }
      } catch (err) {
        alert("Error al eliminar trabajador: " + (err.response?.data?.error || err.message));
      }
    }
  };

  return (
    <div className="modulo-contenido">
      {/* KPIs Superiores */}
      <div className="contenedor-kpis">
        <div className="tarjeta-kpi">
          <h4>Total trabajadores</h4>
          <p className="kpi-numero">{totalActivos}</p>
          <span>activos en el sistema</span>
        </div>
        <div className="tarjeta-kpi">
          <h4>Costureras</h4>
          <p className="kpi-numero">{costureras}</p>
          <span>Subárea de costura</span>
        </div>
        <div className="tarjeta-kpi">
          <h4>Cortadores</h4>
          <p className="kpi-numero">{cortadores}</p>
          <span>Corte y remalle</span>
        </div>
        <div className="tarjeta-kpi">
          <h4>Planchadores</h4>
          <p className="kpi-numero">{planchadores}</p>
          <span>Acabado y planchado</span>
        </div>
      </div>

      {/* Barra de Acciones */}
      <div className="barra-acciones-tabla">
        <input
          type="text"
          className="buscador-entrada"
          placeholder="Buscar por nombre o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="bloque-botones-derecha">
          <button className="btn-secundario">Todos los cargos</button>
          <button className="btn-primario-azul" onClick={() => setShowModal(true)}>Registrar trabajador</button>
        </div>
      </div>

      {/* Grilla de Datos */}
      <table className="tabla-sistema">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Nombres y apellidos</th>
            <th>Cargo</th>
            <th>Sueldo base</th>
            <th>Régimen</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((t) => (
            <tr key={t.id_trabajador}>
              <td>{t.dni}</td>
              <td style={{ fontWeight: '600', color: 'var(--color-texto)' }}>{t.nombres} {t.apellidos}</td>
              <td><span className={`badge cargo-${t.cargo?.toLowerCase()}`}>{t.cargo}</span></td>
              <td>
                {t.cargo === 'Planchador'
                  ? 'Destajo (Por saco)'
                  : `S/. ${parseFloat(t.sueldo_base !== undefined && t.sueldo_base !== null ? t.sueldo_base : 1025).toFixed(2)}`
                }
              </td>
              <td>{t.regimen}</td>
              <td>
                <span className={`badge ${t.estado === 'ACTIVO' ? 'estado-activo' : 'estado-ausente'}`}>
                  {t.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-secundario"
                    style={{ 
                      padding: '6px 10px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onClick={() => handleAbrirEditar(t)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-secundario"
                    style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 'bold' }}
                    onClick={() => handleToggleEstado(t.id_trabajador)}
                  >
                    {t.estado === 'ACTIVO' ? 'Deshabilitar' : 'Habilitar'}
                  </button>
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
                    onClick={() => handleEliminar(t.id_trabajador, `${t.nombres} ${t.apellidos}`)}
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Registro de Trabajador */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-contenedor">
            <div className="modal-cabecera">
              <h3>Registrar Nuevo Trabajador</h3>
              <button className="btn-cerrar-modal" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleRegistrar}>
              <div className="modal-cuerpo">
                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>DNI *</label>
                    <input
                      type="text"
                      maxLength="8"
                      placeholder="Ingrese 8 dígitos"
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label>PIN de Seguridad *</label>
                    <input
                      type="password"
                      maxLength="8"
                      placeholder="PIN de 8 dígitos"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>

                <div className="grupo-formulario">
                  <label>Nombres *</label>
                  <input
                    type="text"
                    placeholder="Nombres del trabajador"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                  />
                </div>

                <div className="grupo-formulario">
                  <label>Apellidos *</label>
                  <input
                    type="text"
                    placeholder="Apellidos del trabajador"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required
                  />
                </div>

                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>Cargo / Rol *</label>
                    <select value={idCargo} onChange={(e) => setIdCargo(e.target.value)} required>
                      {cargos.map(c => (
                        <option key={c.id_cargo} value={c.id_cargo}>{c.nombre_cargo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grupo-formulario">
                    <label>Sueldo Mensual Base *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={esPlanchador ? '0' : sueldoBase}
                      onChange={(e) => setSueldoBase(e.target.value)}
                      disabled={esPlanchador}
                      required={!esPlanchador}
                      placeholder={esPlanchador ? 'No aplica (Cobro por saco)' : 'Ingrese sueldo base'}
                    />
                    {esPlanchador && (
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold', marginTop: '2px' }}>
                        Los planchadores cobran por destajo (S/. 1.50 por saco planchado) y no tienen sueldo base.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grupo-formulario-checkbox">
                  <input
                    type="checkbox"
                    id="asigFamCheck"
                    checked={asigFam}
                    onChange={(e) => setAsigFam(e.target.checked)}
                  />
                  <label htmlFor="asigFamCheck">¿Tiene Asignación Familiar?</label>
                </div>
              </div>
              <div className="modal-pie">
                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar">Guardar Trabajador</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edición de Trabajador */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-contenedor">
            <div className="modal-cabecera">
              <h3>Editar Trabajador</h3>
              <button className="btn-cerrar-modal" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditar}>
              <div className="modal-cuerpo">
                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>DNI *</label>
                    <input
                      type="text"
                      maxLength="8"
                      placeholder="Ingrese 8 dígitos"
                      value={editDni}
                      onChange={(e) => setEditDni(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label>PIN de Seguridad *</label>
                    <input
                      type="password"
                      maxLength="8"
                      placeholder="PIN de 8 dígitos"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>

                <div className="grupo-formulario">
                  <label>Nombres *</label>
                  <input
                    type="text"
                    placeholder="Nombres del trabajador"
                    value={editNombres}
                    onChange={(e) => setEditNombres(e.target.value)}
                    required
                  />
                </div>

                <div className="grupo-formulario">
                  <label>Apellidos *</label>
                  <input
                    type="text"
                    placeholder="Apellidos del trabajador"
                    value={editApellidos}
                    onChange={(e) => setEditApellidos(e.target.value)}
                    required
                  />
                </div>

                <div className="grupo-formulario-fila">
                  <div className="grupo-formulario">
                    <label>Cargo / Rol *</label>
                    <select value={editIdCargo} onChange={(e) => setEditIdCargo(e.target.value)} required>
                      {cargos.map(c => (
                        <option key={c.id_cargo} value={c.id_cargo}>{c.nombre_cargo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grupo-formulario">
                    <label>Sueldo Mensual Base *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cargos.find(c => c.id_cargo.toString() === editIdCargo)?.nombre_cargo === 'Planchador' ? '0' : editSueldoBase}
                      onChange={(e) => setEditSueldoBase(e.target.value)}
                      disabled={cargos.find(c => c.id_cargo.toString() === editIdCargo)?.nombre_cargo === 'Planchador'}
                      required={cargos.find(c => c.id_cargo.toString() === editIdCargo)?.nombre_cargo !== 'Planchador'}
                      placeholder={cargos.find(c => c.id_cargo.toString() === editIdCargo)?.nombre_cargo === 'Planchador' ? 'No aplica (Cobro por saco)' : 'Ingrese sueldo base'}
                    />
                    {cargos.find(c => c.id_cargo.toString() === editIdCargo)?.nombre_cargo === 'Planchador' && (
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold', marginTop: '2px' }}>
                        Los planchadores cobran por destajo (S/. 1.50 por saco planchado) y no tienen sueldo base.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grupo-formulario-checkbox">
                  <input
                    type="checkbox"
                    id="editAsigFamCheck"
                    checked={editAsigFam}
                    onChange={(e) => setEditAsigFam(e.target.checked)}
                  />
                  <label htmlFor="editAsigFamCheck">¿Tiene Asignación Familiar?</label>
                </div>
              </div>
              <div className="modal-pie">
                <button type="button" className="btn-cancelar" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar">Actualizar Trabajador</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Personal;