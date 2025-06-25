require("dotenv").config();
const { google } = require("googleapis");
const stream = require("stream");

// Construir objeto de credenciales desde .env
const credentials = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Manejar saltos de línea
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
};

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// Función para buscar o crear carpetas
async function obtenerOcrearCarpeta(nombreCarpeta, padreId = null) {
    let query = `name="${nombreCarpeta}" and mimeType="application/vnd.google-apps.folder" and trashed=false`;
    if (padreId) query += ` and "${padreId}" in parents`;
    
    const res = await drive.files.list({
      q: query,
      fields: "files(id, name)",
    });
    
    if (res.data.files.length > 0) {
      return res.data.files[0].id;
    }
    
    // Crear carpeta si no existe
    const carpeta = await drive.files.create({
      requestBody: {
        name: nombreCarpeta,
        mimeType: "application/vnd.google-apps.folder",
        parents: padreId ? [padreId] : [],
      },
      fields: "id",
    });
    
    return carpeta.data.id;
}
  
// Función principal para subir PDFs con estructura organizada
module.exports.subirPDFaDrive = async (buffer, nombre, ruta, mes) => {
    try {
      // Crear estructura de carpetas
      const carpetaBase = await obtenerOcrearCarpeta("Cobranzas", process.env.GOOGLE_DRIVE_FOLDER_ID);
      const carpetaMes = await obtenerOcrearCarpeta(mes, carpetaBase);
      const carpetaRuta = await obtenerOcrearCarpeta(ruta, carpetaMes);
  
      // Subir el archivo
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);
  
      const file = await drive.files.create({
        requestBody: {
          name: nombre,
          parents: [carpetaRuta],
        },
        media: {
          mimeType: "application/pdf",
          body: bufferStream,
        },
      });
  
      // Hacer público el archivo
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
  
      return {
        url: `https://drive.google.com/file/d/${file.data.id}/view`,
        idCarpeta: carpetaRuta,
        idArchivo: file.data.id
      };
  
    } catch (error) {
      console.error("Error en subirPDFaDrive:", error);
      throw new Error("Error al subir el archivo a Drive");
    }
  };
  