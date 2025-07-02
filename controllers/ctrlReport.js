const { Pedido, PedidoComunidad, Comunidad, Municipio, Usuario, Ruta } = require("../models/index");
const logger = require("../utils/logger");
const { Sequelize, Op } = require("sequelize");

// Utility function for error responses
const sendErrorResponse = (res, statusCode, message) => {
    return res.status(statusCode).json({
        status: "error",
        error: { code: statusCode, message },
        meta: { request_time: new Date().toLocaleString() },
    });
};

// Utility function for success responses
const sendSuccessResponse = (res, statusCode, data) => {
    return res.status(statusCode).json({
        status: "success",
        data,
        meta: { request_time: new Date().toLocaleString() },
    });
};

const getResumen = async (req, res) => {
    try {
        const { view, year, month } = req.query;
        
        // Validar parámetros
        if (!view || (view !== 'anual' && view !== 'mensual')) 
            return sendErrorResponse(res, 400, "Parámetro 'view' inválido. Debe ser 'anual' o 'mensual'");
        
        if (!year) 
            return sendErrorResponse(res, 400, "Parámetro 'year' requerido");
        
        if (view === 'mensual' && !month) 
            return sendErrorResponse(res, 400, "Parámetro 'month' requerido para vista mensual");

        // Calcular rangos de fechas según la vista
        let startDate, endDate;
        if (view === 'anual') {
            startDate = new Date(year, 0, 1); // 1 de Enero del año
            endDate = new Date(year, 11, 31); // 31 de Diciembre del año
        } else { // mensual
            const monthIndex = parseInt(month) - 1; // Los meses en JS son 0-indexed
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
        }

        // A. Obtener pedidos según el rango de fechas
        const pedidosCompletos = await Pedido.findAll({
            include: [
                { model: Usuario, attributes: ["id", "username"], as: "usuario" },
                { model: Ruta, attributes: ["id", "nombre"], as: "ruta" },
                { 
                    model: PedidoComunidad,
                    as: "pedidoComunidad",
                    include: [{ 
                        model: Comunidad, 
                        attributes: ["id", "nombre"], 
                        as: "comunidad" 
                    }]
                }
            ],
            where: { 
                fechaEntrega: { 
                    [Op.between]: [startDate, endDate] 
                } 
            }
        });
        
        // B. Procesar data
        const procesarData = (pedidos, viewType) => {
            let despensasPorMes = {};
            let tiposDespensas = { costo: 0, medioCosto: 0, sinCosto: 0, apadrinadas: 0 };
            let trabajadores = {};
            let comunidades = {};
            let rutas = {};
            let devolucionesRutas = {};

            pedidos.forEach(pedido => {
                // Determinar clave según vista
                const clave = viewType === 'anual' 
                    ? new Date(pedido.fechaEntrega).toISOString().slice(0, 7) // YYYY-MM
                    : 'current'; // Única clave para vista mensual

                if (!despensasPorMes[clave]) {
                    despensasPorMes[clave] = { costo: 0, medioCosto: 0, sinCosto: 0, apadrinadas: 0 };
                }
                
                pedido.pedidoComunidad.forEach(pc => {
                    // Sumar tipos de despensas
                    tiposDespensas.costo += pc.despensasCosto;
                    tiposDespensas.medioCosto += pc.despensasMedioCosto;
                    tiposDespensas.sinCosto += pc.despensasSinCosto;
                    tiposDespensas.apadrinadas += pc.despensasApadrinadas;

                    // Sumar por mes/clave
                    despensasPorMes[clave].costo += pc.despensasCosto;
                    despensasPorMes[clave].medioCosto += pc.despensasMedioCosto;
                    despensasPorMes[clave].sinCosto += pc.despensasSinCosto;
                    despensasPorMes[clave].apadrinadas += pc.despensasApadrinadas;

                    // Top comunidades
                    const comunidadNombre = pc.comunidad.nombre;
                    comunidades[comunidadNombre] = (comunidades[comunidadNombre] || 0) + 
                        pc.despensasCosto + pc.despensasMedioCosto + pc.despensasSinCosto;
                });

                // Top trabajadores (por despensas)
                if (pedido.usuario) {
                    const tsId = pedido.usuario.id;
                    let totalDespensas = 0;
                    pedido.pedidoComunidad.forEach(pc => {
                        totalDespensas += pc.despensasCosto + pc.despensasMedioCosto + 
                                         pc.despensasSinCosto + pc.despensasApadrinadas;
                    });
                    trabajadores[tsId] = {
                        username: pedido.usuario.username,
                        total: (trabajadores[tsId]?.total || 0) + totalDespensas
                    };
                }

                // Top rutas y devoluciones
                if (pedido.ruta) {
                    const rutaNombre = pedido.ruta.nombre;
                    const totalDespensas = pedido.pedidoComunidad
                        .reduce((total, pc) => total + 
                            pc.despensasCosto + pc.despensasMedioCosto + 
                            pc.despensasSinCosto + pc.despensasApadrinadas, 0);
                    
                    rutas[rutaNombre] = (rutas[rutaNombre] || 0) + totalDespensas;
                    devolucionesRutas[rutaNombre] = (devolucionesRutas[rutaNombre] || 0) + (pedido.devoluciones || 0);
                }
            });
            
            // Formatear despensasPorMes según vista
            let formattedDespensas = [];
            if (viewType === 'anual') {
                formattedDespensas = Object.entries(despensasPorMes)
                    .map(([mes, valores]) => ({ mes, ...valores }));
            } else {
                formattedDespensas = [{ mes: `${year}-${month.padStart(2, '0')}`, ...despensasPorMes['current'] }];
            }

            return {
                despensasPorMes: formattedDespensas,
                tiposDespensas,
                topTrabajadores: Object.values(trabajadores).sort((a, b) => b.total - a.total).slice(0, 5),
                topComunidades: Object.entries(comunidades).sort((a, b) => b[1] - a[1]).slice(0, 5),
                topRutas: Object.entries(rutas).sort((a, b) => b[1] - a[1]).slice(0, 5),
                rutasDevoluciones: Object.entries(devolucionesRutas).sort((a, b) => b[1] - a[1]).slice(0, 5)
            };
        };

        // C. Calendario (solo para vista mensual)
        let calendario = [];
        calendario = await Pedido.findAll({
            attributes: ["fechaEntrega", "estado"],
            include: [
                { model: Ruta, attributes: ["nombre"], as: "ruta" },
                { model: PedidoComunidad, as: "pedidoComunidad", attributes: [
                    "despensasCosto", "despensasMedioCosto", 
                    "despensasSinCosto", "despensasApadrinadas"
                ]}
            ],
            where: { fechaEntrega: { [Op.between]: [startDate, endDate] } }
        });

        // D. Combinar resultados
        const resultadoFinal = {
            ...procesarData(pedidosCompletos, view),
            calendario: calendario.map(p => {
                const totalDespensas = p.pedidoComunidad?.reduce((total, pc) => 
                    total + pc.despensasCosto + pc.despensasMedioCosto + 
                    pc.despensasSinCosto + pc.despensasApadrinadas, 0) || 0;
                
                return {
                    fecha: p.fechaEntrega,
                    estado: p.estado,
                    ruta: p.ruta?.nombre || "Sin ruta",
                    totalDespensas
                };
            })
        };

        sendSuccessResponse(res, 200, resultadoFinal);
    } catch (error) {
        logger.error("Error en getResumen: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

const getReporteRutas = async (req, res) => {
    try {
        const { view, year, month } = req.query;
        
        // Validar parámetros
        if (!view || (view !== 'anual' && view !== 'mensual')) 
            return sendErrorResponse(res, 400, "Parámetro 'view' inválido. Debe ser 'anual' o 'mensual'");
        
        if (!year) 
            return sendErrorResponse(res, 400, "Parámetro 'year' requerido");
        
        if (view === 'mensual' && !month) 
            return sendErrorResponse(res, 400, "Parámetro 'month' requerido para vista mensual");

        // Calcular rangos de fechas según la vista
        let startDate, endDate;
        if (view === 'anual') {
            startDate = new Date(year, 0, 1); // 1 de Enero del año
            endDate = new Date(year, 11, 31); // 31 de Diciembre del año
        } else { // mensual
            const monthIndex = parseInt(month) - 1; // Los meses en JS son 0-indexed
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
        }

        // 1. Obtener todas las rutas con sus métricas
        const rutas = await Ruta.findAll({
            as: "rutas",
            attributes: [
                "id",
                "nombre",
                [Sequelize.fn("COUNT", Sequelize.col("pedido.id")), "totalPedidos"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.devoluciones")), "totalDevoluciones"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasCosto")), "despensasCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasMedioCosto")), "despensasMedioCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasSinCosto")), "despensasSinCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasApadrinadas")), "despensasApadrinadas"]
            ],
            include: [{
                model: Pedido,
                as: "pedido",
                attributes: [],
                include: [{
                    model: PedidoComunidad,
                    as: "pedidoComunidad",
                    attributes: []
                }],
                where: { 
                    fechaEntrega: { 
                        [Op.between]: [startDate, endDate] 
                    } 
                },
            }],
            group: ["rutas.id"],
            raw: true
        });

        // 2. Procesar datos para respuesta
        const procesado = rutas.map(ruta => {
            const totalDespensas = 
                (Number(ruta.despensasCosto) || 0) +
                (Number(ruta.despensasMedioCosto) || 0) +
                (Number(ruta.despensasSinCosto) || 0) +
                (Number(ruta.despensasApadrinadas) || 0);

            return {
                id: ruta.id,
                nombre: ruta.nombre,
                metricas: {
                    pedidos: Number(ruta.totalPedidos) || 0,
                    despensas: totalDespensas,
                    devoluciones: Number(ruta.totalDevoluciones) || 0,
                    detalleDespensas: {
                        costo: Number(ruta.despensasCosto) || 0,
                        medioCosto: Number(ruta.despensasMedioCosto) || 0,
                        sinCosto: Number(ruta.despensasSinCosto) || 0,
                        apadrinadas: Number(ruta.despensasApadrinadas) || 0
                    }
                }
            };
        });

        // 3. Ordenar para ranking
        const rankingPedidos = [...procesado].sort((a, b) => 
            b.metricas.pedidos - a.metricas.pedidos
        );
        const rankingDespensas = [...procesado].sort((a, b) => 
            b.metricas.despensas - a.metricas.despensas
        );

        // 4. Datos para gráfica comparativa
        const datosGrafica = {
            labels: procesado.map(r => r.nombre),
            datasets: [{
                label: "Total Despensas",
                data: procesado.map(r => r.metricas.despensas)
            }, {
                label: "Devoluciones",
                data: procesado.map(r => r.metricas.devoluciones)
            }]
        };

        const response = {
            tablaMetricas: procesado,
            rankingPedidos,
            rankingDespensas,
            graficaComparativa: datosGrafica
        };

        sendSuccessResponse(res, 200, response );

    } catch (error) {
        logger.error("Error en getReporteRutas: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

const getReporteTS = async (req, res) => {
    try {
        const { view, year, month } = req.query;
        
        // Validar parámetros
        if (!view || (view !== 'anual' && view !== 'mensual')) 
            return sendErrorResponse(res, 400, "Parámetro 'view' inválido. Debe ser 'anual' o 'mensual'");
        
        if (!year) 
            return sendErrorResponse(res, 400, "Parámetro 'year' requerido");
        
        if (view === 'mensual' && !month) 
            return sendErrorResponse(res, 400, "Parámetro 'month' requerido para vista mensual");

        // Calcular rangos de fechas según la vista
        let startDate, endDate;
        if (view === 'anual') {
            startDate = new Date(year, 0, 1); // 1 de Enero del año
            endDate = new Date(year, 11, 31); // 31 de Diciembre del año
        } else { // mensual
            const monthIndex = parseInt(month) - 1; // Los meses en JS son 0-indexed
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
        }

        // 1. Obtener métricas base con una sola consulta
        const trabajadores = await Usuario.findAll({
            include: [{
                model: Pedido,
                as: "pedido",
                attributes: [],
                include: [{
                    model: PedidoComunidad,
                    as: "pedidoComunidad",
                    attributes: []
                }],
                where: { 
                    fechaEntrega: { 
                        [Op.between]: [startDate, endDate] 
                    } 
                },
                required: true
            }],
            attributes: [
                "id",
                "username",
                [Sequelize.literal("(SELECT COUNT(*) FROM pedidos WHERE pedidos.idTs = usuarios.id)"), "totalPedidos"],
                [Sequelize.literal("(SELECT SUM(devoluciones) FROM pedidos WHERE pedidos.idTs = usuarios.id)"), "totalDevoluciones"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasCosto")), "despensasCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasMedioCosto")), "despensasMedio"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasSinCosto")), "despensasSinCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedido.pedidoComunidad.despensasApadrinadas")), "despensasApadrinadas"],
                [Sequelize.fn("MAX", Sequelize.col("pedido.fechaEntrega")), "ultimaActividad"]
            ],
            group: ["usuarios.id"],
            raw: true
        });

        // 2. Obtener pedidos pendientes y últimos 3
        const [pendientes, ultimosPedidos] = await Promise.all([
            Pedido.count({
                where: { 
                    idTs: { [Op.in]: trabajadores.map(ts => ts.id) },
                    estado: "pendiente",
                    fechaEntrega: { 
                        [Op.between]: [startDate, endDate] 
                    }
                },
                group: ["idTs"]
            }),
            Pedido.findAll({
                as:"pedido",
                where: { 
                    idTs: { 
                        [Op.in]: trabajadores.map(ts => ts.id) 
                    },
                    fechaEntrega: { 
                        [Op.between]: [startDate, endDate] 
                    } 
                },
                attributes: [
                    "id",
                    "fechaEntrega",
                    "estado",
                    "idTs",
                    [Sequelize.literal("(SELECT SUM(despensasCosto + despensasMedioCosto + despensasSinCosto + despensasApadrinadas) FROM pedidoComunidad WHERE idPedido = pedidos.id)"), "totalDespensas"]
                ],
                order: [[ "idTs", "ASC" ], ["fechaEntrega", "DESC"]]
            })
        ]);

        // 3. Procesamiento en JS
        const totalGlobalPedidos = trabajadores.reduce((acc, ts) => acc + Number(ts.totalPedidos || 0), 0);
        
        const procesado = trabajadores.map(ts => {
            const totalDespensas = Object.keys(ts)
                .filter(k => k.startsWith("despensas"))
                .reduce((acc, key) => acc + Number(ts[key] || 0), 0);

            const pedidosPendientes = pendientes.find(p => p.idTs === ts.id)?.count || 0;
            const avgDespensas = ts.totalPedidos > 0 
                ? (totalDespensas / ts.totalPedidos).toFixed(1)
                : 0;
            const porcentajeDevoluciones = ts.totalPedidos > 0 && totalDespensas > 0
                ? ((ts.totalDevoluciones / totalDespensas) * 100).toFixed(1)
                : 0;
                
            return {
                ...ts,
                metricas: {
                    pedidos: Number(ts.totalPedidos) || 0,
                    despensas: totalDespensas,
                    devoluciones: Number(ts.totalDevoluciones) || 0,
                    pedidosPendientes,
                    avgDespensas,
                    porcentajeDevoluciones,
                    porcentajeContribucion: totalGlobalPedidos > 0 
                        ? ((ts.totalPedidos / totalGlobalPedidos) * 100).toFixed(1)
                        : 0,
                    ultimaActividad: ts.ultimaActividad || "N/A"
                }
            };
        });

        // 4. Formatear última actividad
        const ultimosPorTS = ultimosPedidos.reduce((acc, pedido) => {
            if (!acc[pedido.idTs]) acc[pedido.idTs] = [];
            if (acc[pedido.idTs].length < 3) acc[pedido.idTs].push(pedido);
            return acc;
        }, {});

        // 5. Respuesta final
        const respuesta = {
            tablaMetricas: procesado,
            graficas: {
                barras: procesado.map(ts => ({
                    ts: ts.username,
                    pedidos: ts.metricas.pedidos,
                    despensas: ts.metricas.despensas
                })),
                pastel: procesado.map(ts => ({
                    name: ts.username,
                    value: ts.metricas.despensas
                }))
            },
            actividadReciente: Object.entries(ultimosPorTS).map(([idTs, pedidos]) => ({
                tsId: idTs,
                pedidos: pedidos.map(p => ({
                    id: p.id,
                    fecha: p.fechaEntrega,
                    estado: p.estado,
                    despensas: p.get("totalDespensas")
                }))
            }))
        };

        sendSuccessResponse(res, 200, respuesta);

    } catch (error) {
        logger.error("Error en getReporteTS: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

const getReporteDespensas = async (req, res) => {
    try {
        const { view, year, month, comunidadId, municipioId, rutaId, tsId, limit = 10 } = req.query;
        
        // Validar parámetros
        if (!view || (view !== 'anual' && view !== 'mensual')) 
            return sendErrorResponse(res, 400, "Parámetro 'view' inválido. Debe ser 'anual' o 'mensual'");
        
        if (!year) 
            return sendErrorResponse(res, 400, "Parámetro 'year' requerido");
        
        if (view === 'mensual' && !month) 
            return sendErrorResponse(res, 400, "Parámetro 'month' requerido para vista mensual");

        // Calcular rangos de fechas según la vista
        let startDate, endDate;
        if (view === 'anual') {
            startDate = new Date(year, 0, 1); // 1 de Enero del año
            endDate = new Date(year, 11, 31); // 31 de Diciembre del año
        } else { // mensual
            const monthIndex = parseInt(month) - 1; // Los meses en JS son 0-indexed
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
        }

        // Construir includes dinámicos para comunidad y municipio
        const pedidoComunidadInclude = {
            model: PedidoComunidad,
            as: "pedidoComunidad",
            include: [{
                model: Comunidad,
                as: "comunidad",
                include: [{  // <- Incluir Municipio siempre
                    model: Municipio,
                    as: "municipio",
                    ...(municipioId && { where: { id: municipioId } }), // Filtro opcional
                    required: !!municipioId // Solo requerido si hay filtro
                }]
            }],
            required: comunidadId || municipioId // Solo requerido si hay filtros
        };

        if (comunidadId || municipioId) {
            const comunidadInclude = {
                model: Comunidad,
                as: "comunidad",
                include: [],
                where: comunidadId ? { id: comunidadId } : {},
                required: !!comunidadId
            };

            if (municipioId) {
                comunidadInclude.include.push({
                    model: Municipio,
                    as: "municipio",
                    where: { id: municipioId },
                    required: true
                });
                comunidadInclude.required = true;
            }

            pedidoComunidadInclude.include.push(comunidadInclude);
            pedidoComunidadInclude.required = true;
        }

        // Obtener pedidos con relaciones
        const pedidos = await Pedido.findAll({
            where: {
                fechaEntrega: {
                    [Op.between]: [startDate, endDate]
                },
            },
            include: [
                pedidoComunidadInclude,
                { model: Ruta, as: "ruta", attributes: ["id", "nombre"] },
                { model: Usuario, as: "usuario", attributes: ["id", "username"] }
            ],
            order: [["fechaEntrega", "DESC"]]
        });

        // Procesar datos para las métricas
        let monthlyData = {};
        let tiposDespensas = { costo: 0, medioCosto: 0, sinCosto: 0, apadrinadas: 0 };
        let devolucionesPorMes = {};
        let devolucionesPorRuta = {};
        let routeStats = {};
        let comunidadStats = {};
        let totalDespensas = 0;

        pedidos.forEach(pedido => {
            // Procesar devoluciones
            const mesKey = new Date( pedido.fechaEntrega ).toISOString().slice(0, 7);
            devolucionesPorMes[mesKey] = (devolucionesPorMes[mesKey] || 0) + (pedido.devoluciones || 0);
            
            const rutaNombre = pedido.ruta?.nombre || "Sin ruta";
            devolucionesPorRuta[rutaNombre] = (devolucionesPorRuta[rutaNombre] || 0) + (pedido.devoluciones || 0);

            // Procesar cada PedidoComunidad
            pedido.pedidoComunidad.forEach(pc => {
                const mes = new Date( pedido.fechaEntrega ).toISOString().slice(0, 7);
                if (!monthlyData[mes]) monthlyData[mes] = { costo: 0, medioCosto: 0, sinCosto: 0, apadrinadas: 0 };
                
                monthlyData[mes].costo += pc.despensasCosto;
                monthlyData[mes].medioCosto += pc.despensasMedioCosto;
                monthlyData[mes].sinCosto += pc.despensasSinCosto;
                monthlyData[mes].apadrinadas += pc.despensasApadrinadas;

                // Sumar tipos
                tiposDespensas.costo += pc.despensasCosto;
                tiposDespensas.medioCosto += pc.despensasMedioCosto;
                tiposDespensas.sinCosto += pc.despensasSinCosto;
                tiposDespensas.apadrinadas += pc.despensasApadrinadas;
                totalDespensas += pc.despensasCosto + pc.despensasMedioCosto + pc.despensasSinCosto + pc.despensasApadrinadas;

                // Estadísticas por ruta
                if (pedido.ruta) {
                    const rutaId = pedido.ruta.id;
                    routeStats[rutaId] = routeStats[rutaId] || { nombre: pedido.ruta.nombre, totalDespensas: 0, totalPedidos: 0 };
                    routeStats[rutaId].totalDespensas += pc.despensasCosto + pc.despensasMedioCosto + pc.despensasSinCosto + pc.despensasApadrinadas;
                    routeStats[rutaId].totalPedidos += 1;
                }

                // Estadísticas por comunidad
                if (pc.comunidad) {
                    const comunidadId = pc.comunidad.id;
                    const comunidadNombre = pc.comunidad.nombre;
                    const municipioNombre = pc.comunidad.municipio?.nombre || "Sin municipio";
                    
                    comunidadStats[comunidadId] = comunidadStats[comunidadId] || { 
                        nombre: comunidadNombre,
                        municipio: municipioNombre,
                        totalDespensas: 0, 
                        totalPedidos: new Set()  // Usar Set para evitar duplicados
                    };
                    
                    comunidadStats[comunidadId].totalDespensas += pc.despensasCosto + pc.despensasMedioCosto + pc.despensasSinCosto + pc.despensasApadrinadas;
                    comunidadStats[comunidadId].totalPedidos.add(pedido.id);  // Registrar pedidos únicos
                }
            });
        });

        // Calcular promedios
        const totalPedidosCount = pedidos.length;
        const promedioGlobal = totalPedidosCount > 0 ? totalDespensas / totalPedidosCount : 0;

        const promediosPorRuta = Object.values(routeStats).map(r => ({
            ruta: r.nombre,
            promedio: r.totalPedidos > 0 ? (r.totalDespensas / r.totalPedidos) : 0
        }));

        const promediosPorComunidad = Object.values(comunidadStats).map(c => ({
            comunidad: c.nombre,
            municipio: c.municipio,
            promedio: c.totalPedidos.size > 0 
                ? (c.totalDespensas / c.totalPedidos.size) 
                : 0
        }));
        
        // Formatear respuesta
        const response = {
            evolucionMensual: Object.entries(monthlyData)
                .sort(([mesA], [mesB]) => { // Convertir a timestamps para comparación numérica
                    const dateA = new Date(mesA + "-01").getTime();
                    const dateB = new Date(mesB + "-01").getTime();
                    return dateA - dateB; // Orden ascendente (más antiguo primero)
                })
                .map(([mes, data]) => ({ mes, ...data })),
            resumenTipos: tiposDespensas,
            tendenciaDevoluciones: {
                mensual: Object.entries(devolucionesPorMes)
                    .sort(([mesA], [mesB]) => { // Convertir a timestamps para comparación numérica
                        const dateA = new Date(mesA + "-01").getTime();
                        const dateB = new Date(mesB + "-01").getTime();
                        return dateA - dateB; // Orden ascendente (más antiguo primero)
                    })
                    .map(([mes, total]) => ({ mes, total })),
                
                porRuta: Object.entries(devolucionesPorRuta)
                    .sort(([_, a], [__, b]) => b - a) // Mayor a menor
                    .map(([ruta, total]) => ({ ruta, total }))
            },
            promedios: {
                global: promedioGlobal,
                porRuta: promediosPorRuta,
                porComunidad: promediosPorComunidad
            },
            tablaDetallada: pedidos.slice(0, parseInt(limit)).map(p => ({
                id: p.id,
                fecha: p.fechaEntrega,
                estado: p.estado,
                ruta: p.ruta?.nombre,
                ts: p.usuario?.username,
                comunidades: p.pedidoComunidad.map(pc => pc.comunidad?.nombre).filter(n => n).join(", "),
                despensasCosto: p.pedidoComunidad.reduce((acc, pc) => acc + pc.despensasCosto, 0),
                despensasMedioCosto: p.pedidoComunidad.reduce((acc, pc) => acc + pc.despensasMedioCosto, 0),
                despensasSinCosto: p.pedidoComunidad.reduce((acc, pc) => acc + pc.despensasSinCosto, 0),
                despensasApadrinadas: p.pedidoComunidad.reduce((acc, pc) => acc + pc.despensasApadrinadas, 0),
                totalDespensas: p.pedidoComunidad.reduce((acc, pc) => acc + pc.despensasCosto + pc.despensasMedioCosto + pc.despensasSinCosto + pc.despensasApadrinadas, 0),
                devoluciones: p.devoluciones
            }))
        };
        
        sendSuccessResponse(res, 200, response);

    } catch (error) {
        logger.error("Error en getReporteDespensas: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

const getReporteComunidades = async (req, res) => {
    try {
        const { view, year, month, comunidadId } = req.query;
        
        // Validar parámetros
        if (!view || (view !== 'anual' && view !== 'mensual')) 
            return sendErrorResponse(res, 400, "Parámetro 'view' inválido. Debe ser 'anual' o 'mensual'");
        
        if (!year) 
            return sendErrorResponse(res, 400, "Parámetro 'year' requerido");
        
        if (view === 'mensual' && !month) 
            return sendErrorResponse(res, 400, "Parámetro 'month' requerido para vista mensual");

        // Calcular rangos de fechas según la vista
        let startDate, endDate;
        if (view === 'anual') {
            startDate = new Date(year, 0, 1); // 1 de Enero del año
            endDate = new Date(year, 11, 31); // 31 de Diciembre del año
        } else { // mensual
            const monthIndex = parseInt(month) - 1; // Los meses en JS son 0-indexed
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
        }

        // 1. Datos principales de todas las comunidades
        const comunidades = await Comunidad.findAll({
            attributes: [
                "id",
                "nombre",
                [
                    Sequelize.fn("COUNT", 
                        Sequelize.fn("DISTINCT", 
                            Sequelize.col("pedidoComunidad.idPedido")
                        )
                    ), 
                    "totalPedidos"
                ],
                [Sequelize.fn("SUM", Sequelize.col("pedidoComunidad.despensasCosto")), "totalCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedidoComunidad.despensasMedioCosto")), "totalMedioCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedidoComunidad.despensasSinCosto")), "totalSinCosto"],
                [Sequelize.fn("SUM", Sequelize.col("pedidoComunidad.despensasApadrinadas")), "totalApadrinadas"]
            ],
            include: [
                {
                    model: Municipio,
                    as: "municipio",
                    attributes: ["id", "nombre"]
                },
                {
                    model: PedidoComunidad,
                    as: "pedidoComunidad",
                    attributes: [],
                    required: false,
                    include: [{
                        model: Pedido,
                        as: "pedido",
                        attributes: [],
                        where: {  // <- Filtro por año
                            fechaEntrega: { 
                                [Op.between]: [startDate, endDate] 
                            }
                        }
                    }]
                }
            ],
            group: ["comunidades.id", "municipio.id", "municipio.nombre"],
            raw: true
        });

        // Procesar datos base
        const procesado = comunidades.map(c => {
            const totalDespensas = 
                (Number(c.totalCosto) || 0) +
                (Number(c.totalMedioCosto) || 0) +
                (Number(c.totalSinCosto) || 0) +
                (Number(c.totalApadrinadas) || 0);

            return {
                id: c.id,
                nombre: c.nombre,
                municipio: c["municipio.nombre"],
                totalPedidos: Number(c.totalPedidos) || 0,
                totalDespensas,
                detalleDespensas: {
                    costo: Number(c.totalCosto) || 0,
                    medioCosto: Number(c.totalMedioCosto) || 0,
                    sinCosto: Number(c.totalSinCosto) || 0,
                    apadrinadas: Number(c.totalApadrinadas) || 0
                }
            };
        });

        // 2. Top comunidades
        const topPedidos = [...procesado].sort((a, b) => b.totalPedidos - a.totalPedidos).slice(0, 5);
        const topDespensas = [...procesado].sort((a, b) => b.totalDespensas - a.totalDespensas).slice(0, 5);

        // 3. Datos para el mapa
        const mapaVolumen = procesado.map(c => ({
            comunidad: c.nombre,
            municipio: c.municipio,
            totalDespensas: c.totalDespensas
        }));

        // 4. Evolución mensual si se especifica comunidad
        let evolucion = [];
        if (comunidadId) {
            const datosEvolucion = await PedidoComunidad.findAll({
                as: "pedidoComunidad",
                attributes: [
                    [Sequelize.fn("date_trunc", "month", Sequelize.col("pedido.fechaEntrega")), "mes"],
                    [Sequelize.fn("SUM", Sequelize.col("despensasCosto")), "costo"],
                    [Sequelize.fn("SUM", Sequelize.col("despensasMedioCosto")), "medioCosto"],
                    [Sequelize.fn("SUM", Sequelize.col("despensasSinCosto")), "sinCosto"],
                    [Sequelize.fn("SUM", Sequelize.col("despensasApadrinadas")), "apadrinadas"]
                ],
                include: [{
                    model: Pedido,
                    as: "pedido",
                    attributes: [],
                    required: true
                }],
                where: { 
                    idComunidad: comunidadId,
                    fechaEntrega: { 
                        [Op.between]: [startDate, endDate] // Filtro por año
                    }
                },
                group: [Sequelize.fn("date_trunc", "month", Sequelize.col("pedido.fechaEntrega"))],
                order: [[Sequelize.literal("mes"), "ASC"]],
                raw: true
            });

            evolucion = datosEvolucion.map(entry => ({
                mes: new Date(entry.mes).toISOString().slice(0, 7),
                totalDespensas: (
                    (Number(entry.costo) || 0) +
                    (Number(entry.medioCosto) || 0) +
                    (Number(entry.sinCosto) || 0) +
                    (Number(entry.apadrinadas) || 0)
                ),
                detalles: {
                    costo: Number(entry.costo) || 0,
                    medioCosto: Number(entry.medioCosto) || 0,
                    sinCosto: Number(entry.sinCosto) || 0,
                    apadrinadas: Number(entry.apadrinadas) || 0
                }
            }));
        }

        // 5. Construir respuesta final
        const response = {
            topComunidadesPedidos: topPedidos,
            topComunidadesDespensas: topDespensas,
            mapaVolumen,
            evolucion: comunidadId ? evolucion : undefined,
            tablaDetallada: procesado.sort((a, b) => b.totalDespensas - a.totalDespensas)
        };
        
        sendSuccessResponse(res, 200, response);

    } catch (error) {
        logger.error("Error en getReporteComunidades: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

const getReporteApadrinadas = async (req, res) => {
    try {
        const { view, year, month, limit = 5 } = req.query;
        
        // Validar parámetros
        if (!view || (view !== 'anual' && view !== 'mensual')) 
            return sendErrorResponse(res, 400, "Parámetro 'view' inválido. Debe ser 'anual' o 'mensual'");
        
        if (!year) 
            return sendErrorResponse(res, 400, "Parámetro 'year' requerido");
        
        if (view === 'mensual' && !month) 
            return sendErrorResponse(res, 400, "Parámetro 'month' requerido para vista mensual");

        // Calcular rangos de fechas según la vista
        let startDate, endDate;
        if (view === 'anual') {
            startDate = new Date(year, 0, 1); // 1 de Enero del año
            endDate = new Date(year, 11, 31); // 31 de Diciembre del año
        } else { // mensual
            const monthIndex = parseInt(month) - 1; // Los meses en JS son 0-indexed
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
        }

        const monthlyData = await PedidoComunidad.findAll({
            attributes: [
                [Sequelize.fn("DATE_FORMAT", Sequelize.col("pedido.fechaEntrega"), "%Y-%m"), "mes"],
                [Sequelize.fn("SUM", Sequelize.col("despensasCosto")), "costo"],
                [Sequelize.fn("SUM", Sequelize.col("despensasMedioCosto")), "medioCosto"],
                [Sequelize.fn("SUM", Sequelize.col("despensasSinCosto")), "sinCosto"],
                [Sequelize.fn("SUM", Sequelize.col("despensasApadrinadas")), "apadrinadas"],
            ],
            include: [{
                model: Pedido,
                as: "pedido",
                attributes: [],
                where: { 
                    fechaEntrega: { 
                        [Op.between]: [startDate, endDate] // Filtra solo el año actual
                    } 
                },
                required: true
            }],
            group: [Sequelize.fn("DATE_FORMAT", Sequelize.col("pedido.fechaEntrega"), "%Y-%m")], // Agrupa por mes
            raw: true
        });
        
        const start = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
        const end = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

        // 2. Top TS y Comunidades en una sola consulta usando Promise.all
        const [topTS, topComunidades] = await Promise.all([
            Usuario.findAll({
                attributes: [
                    "id",
                    "username",
                    [Sequelize.literal(`( SELECT SUM(despensasApadrinadas) FROM pedidoComunidad JOIN pedidos ON pedidoComunidad.idPedido = pedidos.id WHERE pedidos.idTs = usuarios.id AND pedidos.fechaEntrega BETWEEN '${start}' AND '${end}')`), "total"]
                ],
                order: [[Sequelize.literal("total"), "DESC"]],
                limit: parseInt(limit),
                raw: true
            }),
            Comunidad.findAll({
                attributes: [
                    "id",
                    "nombre",
                    [Sequelize.literal(`(SELECT SUM(despensasApadrinadas) FROM pedidoComunidad JOIN pedidos ON pedidoComunidad.idPedido = pedidos.id WHERE pedidoComunidad.idComunidad = comunidades.id AND pedidos.fechaEntrega BETWEEN '${start}' AND '${end}')`), "total"]
                ],
                include: [
                    { model: Municipio, as: "municipio", attributes: ["nombre"] }
                ],
                order: [[Sequelize.literal("total"), "DESC"]],
                limit: parseInt(limit),
                raw: true
            })
        ]);

        // 3. Pedidos apadrinados con paginación
        const pedidosApadrinados = await Pedido.findAll({
            include: [{
                model: PedidoComunidad,
                as: "pedidoComunidad",
                where: { despensasApadrinadas: { [Op.gt]: 0 } },
                attributes: ["despensasApadrinadas"],
                include: [{
                    model: Comunidad,
                    as: "comunidad",
                    attributes: ["nombre"]
                }]
            }, {
                model: Usuario,
                as: "usuario",
                attributes: ["username"]
            }, {
                model: Ruta,
                as: "ruta",
                attributes: ["nombre"]
            }],
            where: {
                fechaEntrega: {
                    [Op.between]: [startDate, endDate] // Filtra solo el año actual
                }
            },
            order: [["fechaEntrega", "DESC"]],
            limit: parseInt(limit)
        });

        // 4. Procesamiento eficiente de datos
        const totalGlobal = monthlyData.reduce((acc, mes) => ({
            costo: acc.costo + Number(mes.costo),
            medioCosto: acc.medioCosto + Number(mes.medioCosto),
            sinCosto: acc.sinCosto + Number(mes.sinCosto),
            apadrinadas: acc.apadrinadas + Number(mes.apadrinadas)
        }), { costo: 0, medioCosto: 0, sinCosto: 0, apadrinadas: 0 });

        const response = {
            evolucionMensual: monthlyData.map(mes => ({
                mes: mes.mes,
                apadrinadas: Number(mes.apadrinadas),
                porcentaje: (Number(mes.apadrinadas) / (Number(mes.costo) + Number(mes.medioCosto) + Number(mes.sinCosto) + Number(mes.apadrinadas)) ) * 100 || 0
            })),
            metricasGlobales: {
                totalApadrinadas: totalGlobal.apadrinadas,
                porcentajeTotal: (totalGlobal.apadrinadas / (totalGlobal.costo + totalGlobal.medioCosto + totalGlobal.sinCosto + totalGlobal.apadrinadas)) * 100 || 0
            },
            topTS: topTS.filter(ts => ts.total > 0).map(ts => ({
                ...ts,
                total: Number(ts.total)
            })),
            topComunidades: topComunidades.filter(com => com.total > 0).map(com => ({
                ...com,
                total: Number(com.total)
            })),
            ultimosPedidos: pedidosApadrinados.map(pedido => ({
                id: pedido.id,
                fecha: pedido.fechaEntrega,
                comunidades: pedido.pedidoComunidad.map(pc => pc.comunidad.nombre),
                totalApadrinadas: pedido.pedidoComunidad.reduce((sum, pc) => sum + pc.despensasApadrinadas, 0)
            }))
        };

        sendSuccessResponse(res, 200, response);

    } catch (error) {
        logger.error("Error en getReporteApadrinadas: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

const getReporteEconomico = async (req, res) => {
    try {
        const { view, year, month, comunidadId, municipioId, rutaId, tsId } = req.query;
        
        // Validar parámetros
        if (!view || (view !== 'anual' && view !== 'mensual')) 
            return sendErrorResponse(res, 400, "Parámetro 'view' inválido. Debe ser 'anual' o 'mensual'");
        
        if (!year) 
            return sendErrorResponse(res, 400, "Parámetro 'year' requerido");
        
        if (view === 'mensual' && !month) 
            return sendErrorResponse(res, 400, "Parámetro 'month' requerido para vista mensual");

        // Calcular rangos de fechas según la vista
        let startDate, endDate;
        if (view === 'anual') {
            startDate = new Date(year, 0, 1); // 1 de Enero del año
            endDate = new Date(year, 11, 31); // 31 de Diciembre del año
        } else { // mensual
            const monthIndex = parseInt(month) - 1; // Los meses en JS son 0-indexed
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
        }

        // Obtener todos los pedidosComunidad con relaciones necesarias
        const pedidoComunidades = await PedidoComunidad.findAll({
            include: [
                {
                    model: Pedido,
                    as: "pedido",
                    where: {
                        fechaEntrega: {
                            [Op.between]: [startDate, endDate] // Filtra solo el año actual
                        }
                    },
                    required: true,
                    include: [
                        { model: Ruta, as: "ruta", attributes: ["id", "nombre"] },
                        { model: Usuario, as: "usuario", attributes: ["id", "username"] }
                    ]
                },
                {
                    model: Comunidad,
                    as: "comunidad",
                    required: true,
                    include: [{
                        model: Municipio,
                        as: "municipio",
                        attributes: ["id", "nombre"],
                        where: municipioId ? { id: municipioId } : {},
                        required: !!municipioId
                    }],
                    where: comunidadId ? { id: comunidadId } : {}
                }
            ]
        });

        // Procesamiento de datos
        let metrics = {
            evolucionMensual: {},
            comunidades: {},
            municipios: {},
            rutas: {},
            resumenGlobal: {
                costoTotal: 0,
                ingresosRecaudados: 0,
                despensasSubsidiadas: 0,
                balanceNeto: 0,
                totalDespensasEntregadas: 0, // Nuevo campo: total de despensas
                detalle: {
                    costoCompleto: 0,
                    medioCosto: 0,
                    sinCosto: 0,
                    apadrinadas: 0
                },
                detalleConteo: { // Nuevo desglose por tipo (conteo)
                    costoCompleto: 0,
                    medioCosto: 0,
                    sinCosto: 0,
                    apadrinadas: 0
                }
            }
        };

        pedidoComunidades.forEach(pc => {
            const costo = pc.comunidad.costoPaquete;
            const mesKey = new Date(pc.pedido.fechaEntrega).toISOString().slice(0, 7);
            
            // Cálculos económicos
            const ingresosCosto = pc.despensasCosto * costo;
            const ingresosMedio = pc.despensasMedioCosto * (costo / 2);
            const costoSin = pc.despensasSinCosto * costo;
            const costoApadrinadas = pc.despensasApadrinadas * costo;

            // Variables agrupadas
            const ingresosRecaudados = ingresosCosto + ingresosMedio;
            const despensasSubsidiadas = costoSin + costoApadrinadas;
            const costoTotal = ingresosRecaudados + despensasSubsidiadas;
            
            // Calcular total de despensas para este pedidoComunidad
            const totalDespensas = pc.despensasCosto + pc.despensasMedioCosto + 
                                  pc.despensasSinCosto + pc.despensasApadrinadas;

            // Actualizar métricas globales
            metrics.resumenGlobal.costoTotal += costoTotal;
            metrics.resumenGlobal.ingresosRecaudados += ingresosRecaudados;
            metrics.resumenGlobal.despensasSubsidiadas += despensasSubsidiadas;
            metrics.resumenGlobal.detalle.costoCompleto += ingresosCosto;
            metrics.resumenGlobal.detalle.medioCosto += ingresosMedio;
            metrics.resumenGlobal.detalle.sinCosto += costoSin;
            metrics.resumenGlobal.detalle.apadrinadas += costoApadrinadas;
            
            // Actualizar conteo de despensas por tipo
            metrics.resumenGlobal.detalleConteo.costoCompleto += pc.despensasCosto;
            metrics.resumenGlobal.detalleConteo.medioCosto += pc.despensasMedioCosto;
            metrics.resumenGlobal.detalleConteo.sinCosto += pc.despensasSinCosto;
            metrics.resumenGlobal.detalleConteo.apadrinadas += pc.despensasApadrinadas;
            
            // Actualizar total de despensas
            metrics.resumenGlobal.totalDespensasEntregadas += totalDespensas;
            
            // Evolución mensual
            if (!metrics.evolucionMensual[mesKey]) {
                metrics.evolucionMensual[mesKey] = {
                    costoTotal: 0,
                    ingresosRecaudados: 0,
                    despensasSubsidiadas: 0,
                    totalDespensasEntregadas: 0
                };
            }
            metrics.evolucionMensual[mesKey].costoTotal += costoTotal;
            metrics.evolucionMensual[mesKey].ingresosRecaudados += ingresosRecaudados;
            metrics.evolucionMensual[mesKey].despensasSubsidiadas += despensasSubsidiadas;
            metrics.evolucionMensual[mesKey].totalDespensasEntregadas += totalDespensas;
            
            // Por comunidad
            const comunidadKey = pc.comunidad.nombre;
            if (!metrics.comunidades[comunidadKey]) {
                metrics.comunidades[comunidadKey] = {
                    costoTotal: 0,
                    ingresosRecaudados: 0,
                    despensasSubsidiadas: 0,
                    totalDespensasEntregadas: 0,
                    municipio: pc.comunidad.municipio.nombre
                };
            }
            metrics.comunidades[comunidadKey].costoTotal += costoTotal;
            metrics.comunidades[comunidadKey].ingresosRecaudados += ingresosRecaudados;
            metrics.comunidades[comunidadKey].despensasSubsidiadas += despensasSubsidiadas;
            metrics.comunidades[comunidadKey].totalDespensasEntregadas += totalDespensas;
            
            // Por municipio
            const municipioKey = pc.comunidad.municipio.nombre;
            if (!metrics.municipios[municipioKey]) {
                metrics.municipios[municipioKey] = { 
                    costoTotal: 0,
                    ingresosRecaudados: 0,
                    despensasSubsidiadas: 0,
                    totalDespensasEntregadas: 0
                };
            }
            metrics.municipios[municipioKey].costoTotal += costoTotal;
            metrics.municipios[municipioKey].ingresosRecaudados += ingresosRecaudados;
            metrics.municipios[municipioKey].despensasSubsidiadas += despensasSubsidiadas;
            metrics.municipios[municipioKey].totalDespensasEntregadas += totalDespensas;
            
            // Por ruta
            const rutaKey = pc.pedido.ruta?.nombre || "Sin ruta";
            if (!metrics.rutas[rutaKey]) {
                metrics.rutas[rutaKey] = { 
                    costoTotal: 0,
                    ingresosRecaudados: 0,
                    despensasSubsidiadas: 0,
                    totalDespensasEntregadas: 0
                };
            }
            metrics.rutas[rutaKey].costoTotal += costoTotal;
            metrics.rutas[rutaKey].ingresosRecaudados += ingresosRecaudados;
            metrics.rutas[rutaKey].despensasSubsidiadas += despensasSubsidiadas;
            metrics.rutas[rutaKey].totalDespensasEntregadas += totalDespensas;
        });

        // Calcular balance neto global
        metrics.resumenGlobal.balanceNeto = 
            metrics.resumenGlobal.ingresosRecaudados - metrics.resumenGlobal.despensasSubsidiadas;
        
        // Calcular promedio de ingreso por despensa
        metrics.resumenGlobal.promedioIngresoPorDespensa = 
            metrics.resumenGlobal.totalDespensasEntregadas > 0 
                ? metrics.resumenGlobal.ingresosRecaudados / metrics.resumenGlobal.totalDespensasEntregadas 
                : 0;

        // Formatear respuesta final
        const response = {
            resumenGlobal: {
                ...metrics.resumenGlobal,
                promedioIngresoPorDespensa: metrics.resumenGlobal.promedioIngresoPorDespensa
            },
            evolucionMensual: Object.entries(metrics.evolucionMensual)
                .map(([mes, data]) => ({
                    mes,
                    costoTotal: data.costoTotal,
                    ingresosRecaudados: data.ingresosRecaudados,
                    despensasSubsidiadas: data.despensasSubsidiadas,
                    totalDespensasEntregadas: data.totalDespensasEntregadas,
                    balance: data.ingresosRecaudados - data.despensasSubsidiadas
                }))
                .sort((a, b) => a.mes.localeCompare(b.mes)),
            distribucionComunidades: Object.entries(metrics.comunidades)
                .map(([nombre, data]) => {
                    const porcentajeParticipacion = metrics.resumenGlobal.costoTotal > 0
                        ? (data.costoTotal / metrics.resumenGlobal.costoTotal) * 100
                        : 0;
                    return {
                        nombre,
                        costoTotal: data.costoTotal,
                        ingresosRecaudados: data.ingresosRecaudados,
                        despensasSubsidiadas: data.despensasSubsidiadas,
                        totalDespensasEntregadas: data.totalDespensasEntregadas,
                        municipio: data.municipio,
                        balance: data.ingresosRecaudados - data.despensasSubsidiadas,
                        porcentajeParticipacion
                    };
                })
                .sort((a, b) => b.balance - a.balance),
            distribucionMunicipios: Object.entries(metrics.municipios)
                .map(([nombre, data]) => {
                    const porcentajeParticipacion = metrics.resumenGlobal.costoTotal > 0
                        ? (data.costoTotal / metrics.resumenGlobal.costoTotal) * 100
                        : 0;
                    return {
                        nombre,
                        costoTotal: data.costoTotal,
                        ingresosRecaudados: data.ingresosRecaudados,
                        despensasSubsidiadas: data.despensasSubsidiadas,
                        totalDespensasEntregadas: data.totalDespensasEntregadas,
                        balance: data.ingresosRecaudados - data.despensasSubsidiadas,
                        porcentajeParticipacion
                    };
                })
                .sort((a, b) => b.balance - a.balance),
            distribucionRutas: Object.entries(metrics.rutas)
                .map(([nombre, data]) => {
                    const porcentajeParticipacion = metrics.resumenGlobal.costoTotal > 0
                        ? (data.costoTotal / metrics.resumenGlobal.costoTotal) * 100
                        : 0;
                    return {
                        nombre,
                        costoTotal: data.costoTotal,
                        ingresosRecaudados: data.ingresosRecaudados,
                        despensasSubsidiadas: data.despensasSubsidiadas,
                        totalDespensasEntregadas: data.totalDespensasEntregadas,
                        balance: data.ingresosRecaudados - data.despensasSubsidiadas,
                        porcentajeParticipacion
                    };
                })
                .sort((a, b) => b.balance - a.balance)
        };
        sendSuccessResponse(res, 200, response);
    } catch (error) {
        logger.error("Error en getReporteEconomico: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

const getCalendario = async (req, res) => {
    try {
        // 1. Manejar filtros de fecha (año o todos)
        const { year } = req.query;
        let whereClause = {};

        if (year) {
            const inicioYear = new Date(year, 0, 1); // 1 de Enero del año
            const finYear = new Date(year, 11, 31); // 31 de Diciembre del año
            whereClause.fechaEntrega = { [Op.between]: [inicioYear, finYear] };
        } // Si no hay year, se trae todo el historial

        // 2. Consulta principal con total de despensas
        const calendario = await Pedido.findAll({
            attributes: ["fechaEntrega", "estado", "id"],
            include: [
                {
                    model: Ruta,
                    as: "ruta",
                    attributes: ["nombre"],
                },
                {
                    model: PedidoComunidad,
                    as: "pedidoComunidad",
                    attributes: ["despensasCosto", "despensasMedioCosto", "despensasSinCosto", "despensasApadrinadas"]
                }
            ],
            where: whereClause
        });

        // 3. Calcular total de despensas por pedido
        const calendarioFormateado = calendario.map(pedido => {
            const totalDespensas = pedido.pedidoComunidad
                ?.reduce((total, pc) => {
                    return total + 
                           pc.despensasCosto +
                           pc.despensasMedioCosto +
                           pc.despensasSinCosto +
                           pc.despensasApadrinadas;
                }, 0) || 0; // Manejo seguro si no hay despensas

            return {
                id: pedido.id,
                fecha: pedido.fechaEntrega,
                estado: pedido.estado,
                ruta: pedido.ruta?.nombre || "Sin ruta",
                totalDespensas: totalDespensas
            };
        });

        sendSuccessResponse(res, 200, calendarioFormateado);
    } catch (error) {
        logger.error("Error en getCalendario: ", error);
        sendErrorResponse(res, 500, error.message);
    }
};

module.exports = {
    getResumen,
    getReporteRutas,
    getReporteTS,
    getReporteDespensas,
    getReporteComunidades,
    getReporteApadrinadas,
    getReporteEconomico,
    getCalendario
};