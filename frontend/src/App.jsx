import { useState } from 'react';
import axios from 'axios';
import logo from './assets/logo.png';
import './App.css';

function App() {
  const [paso, setPaso] = useState(1);
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [campoActivo, setCampoActivo] = useState('dni');
  const [trabajadorLogueado, setTrabajadorLogueado] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);

  const presionarNumero = (num) => {
    if (campoActivo === 'dni') {
      if (dni.length < 8) setDni(dni + num);
    } else {
      if (pin.length < 8) setPin(pin + num);
    }
  };

  const borrarNumero = () => {
    if (campoActivo === 'dni') setDni(dni.slice(0, -1));
    else setPin(pin.slice(0, -1));
  };

  const limpiarCampos = () => {
    setDni('');
    setPin('');
    setCampoActivo('dni');
    setMensajeError(null);
  };

  const procesarLogin = async () => {
    setMensajeError(null);
    if (dni.length !== 8 || pin.length !== 8) {
      setMensajeError('DNI debe tener 8 dígitos y PIN 8 dígitos.');
      return;
    }
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/asistencias/verificar-trabajador', { dni, pin });
      if (res.data.success) {
        setTrabajadorLogueado(res.data.trabajador);
        setPaso(2);
      }
    } catch (err) {
      setMensajeError(err.response?.data?.error || 'Error de conexión con el taller.');
    }
  };

  const ejecutarMarcado = async (tipo) => {
    setMensajeError(null);

    // Validar si es SALIDA y aún no es la hora indicada
    if (tipo === 'SALIDA') {
      if (trabajadorLogueado?.hora_salida) {
        const ahora = new Date();
        const [h, m] = trabajadorLogueado.hora_salida.split(':');
        const horaLimite = new Date();
        horaLimite.setHours(parseInt(h), parseInt(m), 0, 0);

        if (ahora < horaLimite) {
          const horaFormateada = trabajadorLogueado.hora_salida.slice(0, 5);
          alert(`No puedes marcar salida antes de la hora indicada (${horaFormateada}).`);
          return;
        }
      }
    }

    try {
      const res = await axios.post('http://127.0.0.1:3000/api/asistencias/registrar-marca', {
        id_trabajador: trabajadorLogueado.id_trabajador,
        tipoMarca: tipo
      });
      if (res.data.success) {
        alert(`✔ ${res.data.message}\n${res.data.detalle || ''}`);
        limpiarCampos();
        setTrabajadorLogueado(null);
        setPaso(1);
      }
    } catch (err) {
      setMensajeError(err.response?.data?.error || 'Error al procesar marca.');
    }
  };

  return (
    <div className="seccion-cliente">
      <div className="interfaz-taller client-mode">
        <header className="banner-taller" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <img src={logo} alt="AvenroTex Logo" style={{ height: '70px', objectFit: 'contain' }} />
          <h1>SISTEMA DE CONTROL DE ASISTENCIA</h1>
        </header>

        {paso === 1 && (
          <div className="layout-login">
            <div className="formulario-acceso">
              <div className={`campo-digitos ${campoActivo === 'dni' ? 'enfocado' : ''}`} onClick={() => setCampoActivo('dni')}>
                <span>NÚMERO DE DNI</span>
                <div className="caja-vacia">{dni || '________'}</div>
              </div>
              <div className={`campo-digitos ${campoActivo === 'pin' ? 'enfocado' : ''}`} onClick={() => setCampoActivo('pin')}>
                <span>PIN DE SEGURIDAD</span>
                <div className="caja-vacia">{pin ? '*'.repeat(pin.length) : '________'}</div>
              </div>
              <button className="boton-accion btn-ingresar" onClick={procesarLogin}>INGRESAR AL PANEL</button>
              {mensajeError && <div className="banner-error">{mensajeError}</div>}
            </div>
            <div className="grilla-num-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} onClick={() => presionarNumero(n.toString())}>{n}</button>
              ))}
              <button className="btn-util" onClick={limpiarCampos}>C</button>
              <button onClick={() => presionarNumero('0')}>0</button>
              <button className="btn-util" onClick={borrarNumero}>⌫</button>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="layout-opciones">
            <div className="tarjeta-bienvenida">
              <h3>Operario: <span>{trabajadorLogueado?.nombres} {trabajadorLogueado?.apellidos}</span></h3>
              <p>Selecciona la acción de tareo que vas a realizar en este momento:</p>
            </div>
            <div className="menu-botones-gigantes">
              <button className="boton-seleccion btn-entrada" onClick={() => ejecutarMarcado('ENTRADA')}>
                MARCAR ENTRADA {trabajadorLogueado?.hora_entrada ? `(${trabajadorLogueado.hora_entrada.slice(0, 5)})` : ''}
              </button>
              <button className="boton-seleccion btn-salida-ref" onClick={() => ejecutarMarcado('SALIDA_REFRIGERIO')}>
                SALIR A ALMUERZO {trabajadorLogueado?.inicio_refrigerio ? `(${trabajadorLogueado.inicio_refrigerio.slice(0, 5)})` : ''}
              </button>
              <button className="boton-seleccion btn-entrada-ref" onClick={() => ejecutarMarcado('ENTRADA_REFRIGERIO')}>
                RETORNO ALMUERZO {trabajadorLogueado?.fin_refrigerio ? `(${trabajadorLogueado.fin_refrigerio.slice(0, 5)})` : ''}
              </button>
              <button className="boton-seleccion btn-salida" onClick={() => ejecutarMarcado('SALIDA')}>
                MARCAR SALIDA {trabajadorLogueado?.hora_salida ? `(${trabajadorLogueado.hora_salida.slice(0, 5)})` : ''}
              </button>
            </div>
            {mensajeError && <div className="banner-error">{mensajeError}</div>}
            <button className="btn-cancelar-operacion" onClick={() => { setPaso(1); limpiarCampos(); }}>◀ Cancelar / Volver</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
