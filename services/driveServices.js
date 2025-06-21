const { google } = require("googleapis");
const stream = require("stream");

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

module.exports.subirPDFaDrive = async (buffer, nombre) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    const file = await drive.files.create({
        requestBody: {
            name: nombre,
            parents: ["ID_CARPETA_DRIVE"],
        },
        media: {
            mimeType: "application/pdf",
            body: bufferStream,
        },
    });
    
    await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
            role: "reader",
            type: "anyone",
        },
    });
    
    return `https://drive.google.com/file/d/${file.data.id}/view`;
};