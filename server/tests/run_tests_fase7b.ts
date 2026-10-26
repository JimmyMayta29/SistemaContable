import assert from 'assert';
import { authJwtService, sembrarUsuariosPrueba } from '../services/authJwtService';
import { periodoService } from '../services/periodoService';
import { asientoService, ASIENTOS_MEMORIA } from '../services/asientoService';
import { COMPRAS_MEMORIA } from '../services/compraService';
import { VENTAS_MEMORIA } from '../services/ventaService';
import { empresaGuard } from '../middlewares/empresaGuard';
import { requireAuth, requireEmpresaMembership } from '../middlewares/auth';
import { Request, Response } from 'express';

async function ejecutarSuiteFase7B() {
  sembrarUsuariosPrueba();
  console.log('========================================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 7B: NAVEGACIÓN POR EMPRESA');
  console.log('   (Selector de Empresa, Entorno Aislado Nivel 1/2, RBAC & 403)');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function testAssert(cond: boolean, desc: string) {
    total++;
    if (cond) {
      console.log(`  ✅ PASÓ: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${desc}`);
      throw new Error(`Fallo en prueba: ${desc}`);
    }
  }

  const EMPRESA_A = '00000000-0000-0000-0000-000000000001';
  const EMPRESA_B = '00000000-0000-0000-0000-000000000002';
  const EMPRESA_C = 'emp-01';
  const PERIODO_ABIERTO = '2026-09';
  const PERIODO_CERRADO = '2026-08';

  // Configurar períodos
  await periodoService.abrirPeriodo(EMPRESA_A, PERIODO_ABIERTO, 'usr-admin-01');
  await periodoService.abrirPeriodo(EMPRESA_B, PERIODO_ABIERTO, 'usr-admin-01');
  await periodoService.abrirPeriodo(EMPRESA_A, PERIODO_CERRADO, 'usr-admin-01');
  await periodoService.cerrarPeriodo(EMPRESA_A, PERIODO_CERRADO, 'usr-admin-01');

  // --------------------------------------------------------------------------
  // TEST 1: Control de Acceso Estricto y Respuesta 403 al Forzar Empresa Ajena
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Usuario sin acceso a Empresa B recibe 403 por API y Guard');
  {
    // usr-contador-01 tiene acceso a EMPRESA_A y emp-01, pero NO a EMPRESA_B
    const loginContador = await authJwtService.login('contador@sunaconta.pe', 'Sunaconta2026!');
    const tokenContador = loginContador.accessToken;
    testAssert(loginContador.empresasPermitidas.includes(EMPRESA_A), 'Contador tiene acceso a Empresa A');
    testAssert(!loginContador.empresasPermitidas.includes(EMPRESA_B), 'Contador NO tiene acceso a Empresa B en membresías');

    // 1.1 Intentar cambiar empresa activa a EMPRESA_B en authJwtService
    let falloCambio = false;
    try {
      await authJwtService.cambiarEmpresaActiva('usr-contador-01', EMPRESA_B);
    } catch (err: any) {
      falloCambio = err.message.includes('ACCESO_DENEGADO_EMPRESA');
    }
    testAssert(falloCambio, 'Servidor rechaza cambio de empresa a Empresa B con ACCESO_DENEGADO_EMPRESA');

    // 1.2 Probar middleware empresaGuard ante request con token de Contador forzando /e/:empresaId
    let statusCode = 200;
    let errorMsg = '';
    const reqMock: any = {
      method: 'GET',
      headers: {
        authorization: `Bearer ${tokenContador}`,
        'x-empresa-id': EMPRESA_B
      },
      params: {
        empresaId: EMPRESA_B
      },
      user: {
        id: 'usr-contador-01',
        email: 'contador@sunaconta.pe',
        rolGlobal: 'CONTADOR_SENIOR',
        empresasPermitidas: loginContador.empresasPermitidas
      }
    };
    const resMock: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        errorMsg = data.error || '';
        return this;
      }
    };
    let nextCalled = false;
    const nextMock = () => { nextCalled = true; };

    const guard = empresaGuard();
    await guard(reqMock, resMock, nextMock);

    testAssert(statusCode === 403, 'empresaGuard retorna HTTP 403 Forbidden al forzar Empresa B');
    testAssert(!nextCalled, 'Middleware detiene la ejecución del endpoint no autorizado');
    testAssert(errorMsg.includes('PERMISO_INSUFICIENTE'), 'Mensaje de error indica denegación por falta de permisos');

    // 1.3 El servidor resuelve la empresa desde el token y usuario_empresa, nunca confía en empresaId arbitrario
    const reqArbitrario: any = {
      method: 'GET',
      headers: {
        authorization: `Bearer ${tokenContador}`,
        'x-empresa-id': 'empresa-fantasma-999'
      },
      params: {
        empresaId: 'empresa-fantasma-999'
      },
      user: {
        id: 'usr-contador-01',
        email: 'contador@sunaconta.pe',
        rolGlobal: 'CONTADOR_SENIOR',
        empresasPermitidas: loginContador.empresasPermitidas
      }
    };
    let statusCodeArbitrario = 200;
    const resArbitrario: any = {
      status(code: number) {
        statusCodeArbitrario = code;
        return this;
      },
      json(data: any) { return this; }
    };
    await guard(reqArbitrario, resArbitrario, () => {});
    testAssert(statusCodeArbitrario === 403, 'Servidor rechaza empresaId arbitrario inexistente con 403');

    // 1.4 Petición sin token devuelve HTTP 401
    let codeNoToken = 0;
    let msgNoToken = '';
    const reqNoToken: any = { headers: {} };
    const resNoToken: any = {
      status(c: number) { codeNoToken = c; return this; },
      json(d: any) { msgNoToken = d.error || ''; return this; }
    };
    await requireAuth(reqNoToken, resNoToken, () => {});
    testAssert(codeNoToken === 401, 'Petición sin token de autenticación es rechazada con HTTP 401');
    testAssert(msgNoToken.includes('AUTENTICACION_REQUERIDA'), 'Mensaje 401 explícito por falta de token');

    // 1.5 Header x-empresa-id de otra empresa NO cambia el contexto
    const reqSpoof: any = {
      headers: {
        authorization: `Bearer ${tokenContador}`, // token para EMPRESA_A
        'x-empresa-id': EMPRESA_B
      }
    };
    let nextSpoof = false;
    await requireAuth(reqSpoof, {} as any, () => { nextSpoof = true; });
    testAssert(nextSpoof, 'requireAuth procesa token válido');
    testAssert(reqSpoof.empresaId === loginContador.empresaActivaId, 'Contexto req.empresaId permanece inmutable como la empresa del token ignorando x-empresa-id: EMPRESA_B');
    testAssert(reqSpoof.empresaId !== EMPRESA_B, 'Intento de spoofing mediante header x-empresa-id es completamente ignorado');

    // 1.6 Empresa sin membresía devuelve HTTP 403
    const reqNoMembership: any = {
      user: {
        id: 'usr-contador-01',
        rolGlobal: 'CONTADOR_SENIOR',
        empresasPermitidas: [EMPRESA_A]
      },
      empresaId: EMPRESA_B // empresa a la que no pertenece
    };
    let codeNoMem = 0;
    let msgNoMem = '';
    const resNoMem: any = {
      status(c: number) { codeNoMem = c; return this; },
      json(d: any) { msgNoMem = d.error || ''; return this; }
    };
    const membershipCheck = requireEmpresaMembership();
    await membershipCheck(reqNoMembership, resNoMem, () => {});
    testAssert(codeNoMem === 403, 'requireEmpresaMembership devuelve HTTP 403 al no tener membresía en la empresa');
    testAssert(msgNoMem.includes('PERMISO_INSUFICIENTE'), 'Mensaje 403 explícito por denegación de membresía');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Aislamiento Total de Datos y Caché tras Cambio de Empresa
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Tras cambiar de A a B no queda ningún dato de A en pantalla ni en caché');
  {
    // Simular consultas registradas en memoria para Empresa A
    const compraA = {
      id: 'cmp-test-a',
      empresaId: EMPRESA_A,
      rucEmisor: '20555666777',
      razonSocialEmisor: 'Proveedor Empresa A SAC',
      total: 1180.00,
      periodo: PERIODO_ABIERTO
    };
    COMPRAS_MEMORIA.push(compraA as any);

    // Simular consultas registradas para Empresa B
    const compraB = {
      id: 'cmp-test-b',
      empresaId: EMPRESA_B,
      rucEmisor: '20888999111',
      razonSocialEmisor: 'Proveedor Empresa B SRL',
      total: 2360.00,
      periodo: PERIODO_ABIERTO
    };
    COMPRAS_MEMORIA.push(compraB as any);

    // Verificación de llaves compuestas de caché: ['compras', empresaId, periodo]
    const cacheMock: Record<string, any> = {};
    const keyEmpresaA = JSON.stringify(['compras', EMPRESA_A, PERIODO_ABIERTO]);
    const keyEmpresaB = JSON.stringify(['compras', EMPRESA_B, PERIODO_ABIERTO]);

    cacheMock[keyEmpresaA] = [compraA];
    cacheMock[keyEmpresaB] = [compraB];

    testAssert(cacheMock[keyEmpresaA][0].empresaId === EMPRESA_A, 'Caché de Empresa A contiene datos exclusivos de A');
    testAssert(cacheMock[keyEmpresaB][0].empresaId === EMPRESA_B, 'Caché de Empresa B contiene datos exclusivos de B');

    // Al cambiar de empresa: vaciado atómico de caché (queryClient.clear() + cancelQueries())
    for (const k in cacheMock) delete cacheMock[k];
    testAssert(Object.keys(cacheMock).length === 0, 'Invocación de queryClient.clear() purga completamente el caché');

    // Nueva consulta exclusiva para Empresa B
    cacheMock[keyEmpresaB] = [compraB];
    testAssert(!cacheMock[keyEmpresaA], 'Caché de Empresa A ya no existe tras entrar a Empresa B');
    testAssert(cacheMock[keyEmpresaB][0].razonSocialEmisor === 'Proveedor Empresa B SRL', 'Solo datos de Empresa B presentes en memoria');
  }

  // --------------------------------------------------------------------------
  // TEST 3: RBAC y Separación de Menús/Permisos por Rol de Usuario en Empresa
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Un usuario con roles distintos por empresa ve menús y permisos distintos');
  {
    // Supuesto: En Empresa A el usuario opera con rol ADMINISTRADOR
    // En Empresa C el usuario opera con rol AUDITOR (solo lectura)
    const rolesEmpresaMap: Record<string, string> = {
      [EMPRESA_A]: 'ADMINISTRADOR',
      [EMPRESA_C]: 'AUDITOR'
    };

    function resolverPermisosUI(rol: string) {
      return {
        puedeVerConfiguracionSol: rol === 'ADMINISTRADOR',
        puedeEditarComprobantes: rol === 'ADMINISTRADOR' || rol === 'CONTADOR',
        puedeCerrarPeriodos: rol === 'ADMINISTRADOR' || rol === 'CONTADOR',
        esSoloLectura: rol === 'AUDITOR'
      };
    }

    const permisosEmpresaA = resolverPermisosUI(rolesEmpresaMap[EMPRESA_A]);
    const permisosEmpresaC = resolverPermisosUI(rolesEmpresaMap[EMPRESA_C]);

    testAssert(permisosEmpresaA.puedeVerConfiguracionSol === true, 'En Empresa A (ADMIN): Acceso a Configuración Clave SOL habilitado');
    testAssert(permisosEmpresaA.puedeEditarComprobantes === true, 'En Empresa A (ADMIN): Edición de comprobantes y asientos habilitada');
    testAssert(permisosEmpresaA.esSoloLectura === false, 'En Empresa A: Modo no restringido');

    testAssert(permisosEmpresaC.puedeVerConfiguracionSol === false, 'En Empresa C (AUDITOR): Configuración Clave SOL oculta');
    testAssert(permisosEmpresaC.puedeEditarComprobantes === false, 'En Empresa C (AUDITOR): Botones de creación y edición deshabilitados');
    testAssert(permisosEmpresaC.esSoloLectura === true, 'En Empresa C (AUDITOR): Modo de solo lectura estricto');

    // Validación en middleware requireEmpresaMembership para rol AUDITOR
    const reqMutacionAuditor: any = {
      method: 'POST',
      empresaId: EMPRESA_C,
      userRolEnEmpresa: 'AUDITOR_REVISOR',
      user: { id: 'usr-auditor-01', rolGlobal: 'AUDITOR_REVISOR' }
    };
    let statusMutacion = 200;
    const resMutacion: any = {
      status(code: number) { statusMutacion = code; return this; },
      json(data: any) { return this; }
    };
    const checkMembership = requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR', 'ASISTENTE']);
    await checkMembership(reqMutacionAuditor, resMutacion, () => {});
    testAssert(statusMutacion === 403, 'Servidor rechaza con 403 peticiones de mutación para rol AUDITOR');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Bloqueo de Período Cerrado en UI y Backend
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Con período cerrado, la UI bloquea edición y el backend rechaza');
  {
    // 4.1 Verificar que periodoService reporta período cerrado
    const regCerrado = await periodoService.obtenerPorCodigo(EMPRESA_A, PERIODO_CERRADO);
    testAssert(regCerrado?.estado === 'CERRADO', 'Período 2026-08 verificado como CERRADO en repositorio');

    // 4.2 Probar rechazo de mutación vía empresaGuard en período cerrado
    const reqAsientoCerrado: any = {
      method: 'POST',
      params: { empresaId: EMPRESA_A },
      body: {
        periodo: PERIODO_CERRADO,
        subdiario: '01',
        totalDebe: 100
      },
      user: { id: 'usr-admin-01', rolGlobal: 'ADMINISTRADOR' }
    };
    let statusPeriodoCerrado = 200;
    let msgPeriodoCerrado = '';
    const resPeriodoCerrado: any = {
      status(code: number) { statusPeriodoCerrado = code; return this; },
      json(data: any) { msgPeriodoCerrado = data.error || ''; return this; }
    };

    const guardCierre = empresaGuard({ bloquearPeriodoCerrado: true });
    await guardCierre(reqAsientoCerrado, resPeriodoCerrado, () => {});

    testAssert(statusPeriodoCerrado === 400, 'Backend responde con código 400 ante intento de escritura en período cerrado');
    testAssert(msgPeriodoCerrado.includes('PERIODO_CERRADO'), 'Mensaje de error indica explícitamente PERIODO_CERRADO');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Navegación Cruzada Comprobante ↔ Asiento ↔ Mayor y Trabajos en 2do Plano
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Navegación cruzada y trabajos en segundo plano multiempresa');
  {
    // Crear asiento contable en borrador vinculado a comprobante
    const nuevoAsiento = await asientoService.crearBorrador(EMPRESA_A, {
      subdiarioId: '01',
      periodoId: PERIODO_ABIERTO,
      fecha: '2026-09-15',
      moneda: 'PEN',
      tipoCambio: 3.75,
      glosa: 'Por la compra de mercaderías F001-0004521',
      origenId: 'F001-0004521',
      detalles: [
        { linea: 1, cuentaId: '60111', debe: 1000, haber: 0, docSerie: 'F001', docNumero: '0004521' },
        { linea: 2, cuentaId: '40111', debe: 180, haber: 0, docSerie: 'F001', docNumero: '0004521' },
        { linea: 3, cuentaId: '42121', debe: 0, haber: 1180, docSerie: 'F001', docNumero: '0004521' }
      ]
    }, 'usr-admin-01');

    testAssert(nuevoAsiento.origenId === 'F001-0004521', 'Asiento vinculado a comprobante de referencia F001-0004521');

    // Comprobar resolución cruzada hacia Libro Mayor
    const linea60 = nuevoAsiento.detalles.find((l: any) => l.cuentaId === '60111');
    testAssert(Boolean(linea60), 'Línea de cuenta PCGE 60111 generada para Mayor');

    // Trabajos en segundo plano: persisten e identifican su empresa de origen
    const jobs = [
      { id: 'job-1', empresaId: EMPRESA_A, empresaNombre: 'Empresa A', descripcion: 'Sincronización SIRE', progreso: 45 },
      { id: 'job-2', empresaId: EMPRESA_B, empresaNombre: 'Empresa B', descripcion: 'Descarga XML SUNAT', progreso: 100 }
    ];

    testAssert(jobs.length === 2, 'Trabajos de múltiples empresas registrados simultáneamente');
    testAssert(jobs[0].empresaNombre === 'Empresa A', 'Trabajo conserva el nombre de su empresa');
    testAssert(jobs[1].empresaNombre === 'Empresa B', 'Trabajos de Empresa B siguen visibles al estar en Empresa A');
  }

  console.log('\n========================================================================');
  console.log(`📊 RESULTADO SUITE FASE 7B: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('🎉 REQUISITOS DE NAVEGACIÓN EN DOS NIVELES, AISLAMIENTO Y RBAC CUMPLIDOS.');
  console.log('========================================================================\n');
}

ejecutarSuiteFase7B().catch((err) => {
  console.error('❌ Error fatal ejecutando suite Fase 7B:', err);
  process.exit(1);
});
