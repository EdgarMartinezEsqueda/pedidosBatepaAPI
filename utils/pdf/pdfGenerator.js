const jsPDF = require("jspdf");

module.exports = async (pedido) => {
    const doc = new jsPDF();
    
    // Configuración básica
    doc.setFontSize(18);
    doc.text(`Cobranza Pedido #${pedido.id}`, 15, 15);
    
    // Datos del pedido
    doc.setFontSize(12);
    doc.text(`Fecha Entrega: ${pedido.fechaEntrega}`, 15, 25);
    doc.text(`TS: ${pedido.Usuario?.nombre || "N/A"}`, 15, 35);
    
    // Tabla de productos
    let y = 45;
    doc.text("Productos:", 15, y);
    y += 10;
    
    pedido.Productos.forEach((prod, i) => {
        doc.text(`${i+1}. ${prod.nombre} - ${prod.cantidad} x $${prod.precio}`, 20, y);
        y += 7;
    });
    
    // Total
    doc.setFontSize(14);
    doc.text(`Total: $${calcularTotal(pedido.Productos)}`, 15, y + 10);
    
    return doc.output("arraybuffer");
};

function calcularTotal(productos) {
    return productos.reduce((sum, prod) => sum + (prod.precio * prod.cantidad), 0);
}