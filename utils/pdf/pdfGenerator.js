const PdfPrinter = require("pdfmake");

module.exports = async (pedido, datosAdicionales) => {
  try {
    const fonts = {
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold"
      }
    };
    
    const printer = new PdfPrinter(fonts);
    const fechaContabilidad = new Date().toLocaleDateString("es-MX");

    const content = [
        // Primera copia
        ...buildHeader(pedido),
        buildCommunityTable(pedido),
        buildExtrasSection(datosAdicionales),
        buildTotalRecuperacion(pedido, datosAdicionales),
        { canvas: [ { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, dash: { length: 5 } } ], margin: [0, 0, 0, 2] },
      
        // Segunda copia
        ...buildHeader(pedido),
        buildCommunityTable(pedido),
        buildExtrasSection(datosAdicionales),
        buildTotalRecuperacion(pedido, datosAdicionales),
        { canvas: [ { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, dash: { length: 5 } } ], margin: [0, 0, 0, 2] },
      
        // Resumen
        ...buildSummarySection(pedido, fechaContabilidad)
      ];

    const docDefinition = {
      pageMargins: [40, 40, 40, 40],
      content: content,
      styles: {
        header: { fontSize: 10, bold: true, alignment: "center" },
        title: { fontSize: 12, bold: true, alignment: "center", margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, fontSize: 8, alignment: "center" },
        cellCenter: { alignment: "center", fontSize: 7 },
        total: { fontSize: 10, bold: true, margin: [0, 10, 0, 10] }
      },
      defaultStyle: { font: "Helvetica" }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    return new Promise((resolve, reject) => {
      const chunks = [];
      pdfDoc.on("data", chunk => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// HEADER
function buildHeader(pedido) {
    return [
      { text: "BANCO DIOCESANO DE ALIMENTOS DE LOS ALTOS A.C.", style: "header" },
      { text: "RECIBO CUOTA DE RECUPERACIÓN", style: "title" },
      {
        table: {
          widths: ["*", "*", "*"],
          body: [[
            { text: `TS: ${pedido.usuario.username || "N/A"}`, style: "cellCenter" },
            { text: `RUTA: ${pedido.ruta.nombre || "N/A"}`, style: "cellCenter" },
            { text: `FECHA DE ENTREGA: ${pedido.fechaEntrega}`, style: "cellCenter" }
          ]]
        },
        layout: "noBorders",
        margin: [0, 5, 0, 10]
      }
    ];
  }
  

// TABLA COMUNIDADES
function buildCommunityTable(pedido) {
  const body = pedido.pedidoComunidad.map(item => {
    const costo = item.comunidad.costoPaquete;
    const total = item.despensasCosto + item.despensasMedioCosto + item.despensasSinCosto + item.despensasApadrinadas;
    const subtotal = (costo * item.despensasCosto) + ((costo / 2) * item.despensasMedioCosto);

    return [
        { text: item.comunidad.nombre, style: "cellCenter" },
        { text: `$${parseInt(costo).toFixed(2)}`, style: "cellCenter" },
        { text: item.despensasCosto.toString(), style: "cellCenter" },
        { text: item.despensasMedioCosto.toString(), style: "cellCenter" },
        { text: item.despensasSinCosto.toString(), style: "cellCenter" },
        { text: item.despensasApadrinadas.toString(), style: "cellCenter" },
        { text: total.toString(), style: "cellCenter" },
        { text: `$${subtotal.toFixed(2)}`, style: "cellCenter" }
    ];
  });

  // Totales
  const sum = pedido.pedidoComunidad.reduce((acc, item) => {
    acc.cuota += item.despensasCosto;
    acc.medio += item.despensasMedioCosto;
    acc.sin += item.despensasSinCosto;
    acc.apadrinadas += item.despensasApadrinadas;
    acc.total += item.despensasCosto + item.despensasMedioCosto + item.despensasSinCosto + item.despensasApadrinadas;
    acc.subtotal += (item.comunidad.costoPaquete * item.despensasCosto) + 
                    ((item.comunidad.costoPaquete / 2) * item.despensasMedioCosto);
    return acc;
  }, { cuota: 0, medio: 0, sin: 0, apadrinadas: 0, total: 0, subtotal: 0 });

  return {
    table: {
      widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
      headerRows: 1,
      body: [
        [
          { text: "COMUNIDAD", style: "tableHeader" },
          { text: "CUOTA", style: "tableHeader" },
          { text: "CON CUOTA", style: "tableHeader" },
          { text: "MEDIO COSTO", style: "tableHeader" },
          { text: "SIN COSTO", style: "tableHeader" },
          { text: "APADRINADAS", style: "tableHeader" },
          { text: "TOTAL", style: "tableHeader" },
          { text: "TOTAL $", style: "tableHeader" }
        ],
        ...body,
        [
          { text: "TOTAL:", colSpan: 2, style: "cellCenter" }, {}, 
          { text: sum.cuota.toString(), style: "cellCenter" },
          { text: sum.medio.toString(), style: "cellCenter" },
          { text: sum.sin.toString(), style: "cellCenter" },
          { text: sum.apadrinadas.toString(), style: "cellCenter" },
          { text: sum.total.toString(), style: "cellCenter" },
          { text: `$${sum.subtotal.toFixed(2)}`, style: "cellCenter" }
        ]
      ]
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingTop: () => 3,
      paddingBottom: () => 3
    }
  };
}

// TABLA EXTRAS (Arpillas + Excedentes)
function buildExtrasSection(datosAdicionales) {
  const totalArpillas = datosAdicionales.arpillasImporte;
  const totalExcedentes = datosAdicionales.excedentesImporte;

  return {
    table: {
      widths: ["*", "auto", "auto"],
      body: [
        [{ text: "EXTRAS", colSpan: 3, style: "tableHeader" }, {}, {}],
        [ { text: "CONCEPTO", style: "tableHeader" }, { text: "DETALLE", style: "tableHeader" }, { text: "IMPORTE", style: "tableHeader" } ],
        [ { text: "ARPILLAS", style: "cellCenter" }, { text: datosAdicionales.arpillasCantidad.toString(), style: "cellCenter" }, { text: `$${totalArpillas.toFixed(2)}`, style: "cellCenter" } ],
        [ { text: "EXCEDENTES", style: "cellCenter" }, { text: datosAdicionales.excedentes, style: "cellCenter" }, { text: `$${totalExcedentes.toFixed(2)}`, style: "cellCenter" } ]
      ]
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingTop: () => 4,
      paddingBottom: () => 4
    },
    margin: [0, 10, 0, 0]
  };
}

// RESUMEN FINAL
function buildSummarySection(pedido, fechaContabilidad) {
    const totalDespensas = pedido.pedidoComunidad.reduce((sum, item) => 
      sum + item.despensasCosto + item.despensasMedioCosto + 
      item.despensasSinCosto + item.despensasApadrinadas, 0);
  
    const comunidadBody = pedido.pedidoComunidad.map(item => {
      const total = item.despensasCosto + item.despensasMedioCosto +
                    item.despensasSinCosto + item.despensasApadrinadas;
      return [
        { text: item.comunidad.nombre, style: "cellCenter" },
        { text: total.toString(), style: "cellCenter" }
      ];
    });
  
    comunidadBody.push([
      { text: "TOTAL DE DESPENSAS", bold: true, style: "cellCenter" },
      { text: totalDespensas.toString(), bold: true, style: "cellCenter" }
    ]);
  
    return [{
      columns: [
        {
          width: "50%",
          table: {
            headerRows: 1,
            widths: ["*", "auto"],
            body: [
              [
                { text: "COMUNIDAD", style: "tableHeader" },
                { text: "TOTAL DESPENSAS", style: "tableHeader" }
              ],
              ...comunidadBody
            ]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            paddingTop: () => 3,
            paddingBottom: () => 3
          }
        },
        {
          width: "50%",
          table: {
            widths: ["auto", "*"],
            body: [
              [ { text: "Fecha Entrega Ruta:", bold: true, style: "header" }, { text: pedido.fechaEntrega, style: "tableHeader" } ],
              [ { text: "Fecha Contabilidad:", bold: true, style: "header" }, { text: fechaContabilidad, style: "tableHeader" } ],
              [ { text: "Ruta:", bold: true, style: "header" }, { text: pedido.ruta.nombre || "N/A", style: "tableHeader" } ],
              [ { text: "Trabajador Social:", bold: true, style: "header" }, { text: pedido.usuario.username || "N/A", style: "tableHeader" } ],
            ]
          },
          layout: "noBorders",
          margin: [10, 0, 0, 0]
        }
      ],
      columnGap: 10,
      margin: [0, 10, 0, 0]
    }];
  }
  

// TOTAL DESPENSAS $
function calcularTotal(comunidades) {
  return comunidades.reduce((sum, item) => {
    const costoPaquete = item.comunidad.costoPaquete;
    return sum +
      (costoPaquete * item.despensasCosto) +
      ((costoPaquete / 2) * item.despensasMedioCosto);
  }, 0);
}

// TOTAL RECUPERACIÓN POR RUTA
function buildTotalRecuperacion(pedido, datosAdicionales) {
    const totalDespensas = calcularTotal(pedido.pedidoComunidad);
    const totalGeneral = totalDespensas + datosAdicionales.arpillasImporte + datosAdicionales.excedentesImporte;
    return {
      columns: [
        { width: "*", text: "" },
        {
          width: "auto",
          table: {
            body: [
              [
                { text: "TOTAL RECUPERACIÓN POR RUTA:", bold: true, alignment: "right" },
                { text: `$${totalGeneral.toFixed(2)}`, bold: true, alignment: "center" }
              ]
            ]
          },
          layout: "noBorders"
        },
        { width: "*", text: "" }
      ],
      margin: [0, 5, 0, 5]
    };
  }
  