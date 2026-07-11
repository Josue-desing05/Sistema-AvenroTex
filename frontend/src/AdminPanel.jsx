import { useState } from 'react';
import Personal from './components/Personal';
import Asistencia from './components/Asistencia';
import Planilla from './components/Planilla';
import Vacaciones from './components/Vacaciones';
import Reporte from './components/Reporte';
import Produccion from './components/Produccion';
import logo from './assets/logo.png';

function AdminPanel() {
  const [isLogged, setIsLogged] = useState(false);
  const [pestana, setPestana] = useState('personal'); // personal, asistencia, planilla, vacaciones, reporte, produccion
  const [temaOscuro, setTemaOscuro] = useState(false);

  const [correo, setCorreo] = useState('admin@avenrotex.com');
  const [password, setPassword] = useState('123456');

  // Vista 1: Login de Administración (Captura 1)
  if (!isLogged) {
    return (
      <div className="fondo-login-admin">
        <div className="tarjeta-login-admin">
          <img src={logo} alt="AvenroTex Logo" style={{ height: '70px', objectFit: 'contain', marginBottom: '20px' }} />
          <h2>Panel de administración • Sistema de Planilla</h2>

          <div className="grupo-login-input">
            <label>Usuario o Correo</label>
            <input type="text" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>

          <div className="grupo-login-input">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button className="btn-login-ingresar" onClick={() => setIsLogged(true)}>
            Ingresar al panel
          </button>
        </div>
      </div>
    );
  }

  // Vista 2: Aplicación Principal (Capturas 2, 3, 4 y 5)
  return (
    <div className={`layout-oficina-global ${temaOscuro ? 'dark-mode' : ''}`}>
      {/* Header Superior de AvenroTex */}
      <header className="header-oficina-top">
        <div className="bloque-marca-izq">
          <img src={logo} alt="AvenroTex logo" style={{ height: '32px', objectFit: 'contain' }} />
          <div>
            <span>Sistema Web de Planilla</span>
          </div>
        </div>
        <div className="bloque-usuario-der">
          <button
            onClick={() => setTemaOscuro(!temaOscuro)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 'bold',
              marginRight: '15px',
              borderRadius: '6px',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-paneles)',
              color: 'var(--color-texto)'
            }}
          >
            {temaOscuro ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>
          <span>Administrador</span>
          <button className="btn-salir-sistema" onClick={() => setIsLogged(false)}>Salir</button>
        </div>
      </header>

      {/* Menú de Pestañas Principal */}
      <nav className="menu-pestanas-admin">
        <button className={pestana === 'personal' ? 'activo' : ''} onClick={() => setPestana('personal')}>Personal</button>
        <button className={pestana === 'asistencia' ? 'activo' : ''} onClick={() => setPestana('asistencia')}>Asistencia</button>
        <button className={pestana === 'planilla' ? 'activo' : ''} onClick={() => setPestana('planilla')}>Planilla</button>
        <button className={pestana === 'produccion' ? 'activo' : ''} onClick={() => setPestana('produccion')}>Producción</button>
        <button className={pestana === 'vacaciones' ? 'activo' : ''} onClick={() => setPestana('vacaciones')}>Vacaciones</button>
        <button className={pestana === 'reporte' ? 'activo' : ''} onClick={() => setPestana('reporte')}>Reporte</button>
      </nav>

      {/* Renderizado de Componentes Dinámicos */}
      <main className="area-trabajo-paneles">
        {pestana === 'personal' && <Personal />}
        {pestana === 'asistencia' && <Asistencia />}
        {pestana === 'planilla' && <Planilla />}
        {pestana === 'produccion' && <Produccion />}
        {pestana === 'vacaciones' && <Vacaciones />}
        {pestana === 'reporte' && <Reporte />}
      </main>
    </div>
  );
}

export default AdminPanel;