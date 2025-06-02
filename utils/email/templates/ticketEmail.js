const generateTicketTemplate = (ticket, actionType) => {
  let subjectLine, mainContent;

  if (actionType === 'creacion') {
    subjectLine = '¡Tu ticket ha sido creado! 🎉';
    mainContent = `
      <p style="font-size: 16px; color: #333;">
        Hemos recibido tu solicitud con éxito. 
        <br><br>
        <strong>Detalles del ticket:</strong>
      </p>
    `;
  } else {
    subjectLine = 'Actualización de tu ticket 🔄';
    mainContent = `
      <p style="font-size: 16px; color: #333;">
        El estado de tu ticket ha cambiado.
        <br><br>
        <strong>Nuevos detalles:</strong>
      </p>
    `;
  }

  return `
    <body link="#00a5b5" vlink="#00a5b5" alink="#00a5b5">
      <table class="main contenttable" align="center" style="font-weight: normal;border-collapse: collapse;border: 0;margin-left: auto;margin-right: auto;padding: 0;font-family: Arial, sans-serif;color: #555559;background-color: white;font-size: 16px;line-height: 26px;width: 600px;">
        <!-- Encabezado (igual para todos los emails) -->
        <tr>
            <td class="border" style="border-collapse: collapse;border: 1px solid #eeeff0;margin: 0;padding: 0;-webkit-text-size-adjust: none;color: #555559;font-family: Arial, sans-serif;font-size: 16px;line-height: 26px;">
                <table style="font-weight: normal;border-collapse: collapse;border: 0;margin: 0;padding: 0;font-family: Arial, sans-serif;width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td colspan="4" valign="top" class="image-section" style="border-collapse: collapse;border: 0;margin: 0;padding: 0;-webkit-text-size-adjust: none;color: #555559;font-family: Arial, sans-serif;font-size: 16px;line-height: 26px;background-color: #fff;border-bottom: 4px solid #0a8e3d; text-align: center;">
                        <a href="https://bamxtepatitlan.org">
                            <img class="top-image" src="https://bamxtepatitlan.org/assets/logo-B5cTjWox.png" style="width: 100px; margin:20px auto; display: block;" alt="BAMX Tepatitlán logo">
                        </a>
                        </td>
                    </tr>

                    <!-- Contenido Dinámico -->
                    <tr>
                        <td style="padding: 20px 30px;">
                        <h1 style="color: #0a8e3d; margin: 0 0 20px 0;">${subjectLine}</h1>
                        ${mainContent}
                        <table style="width: 100%; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">ID del Ticket</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${ticket.id}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">Estado</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${ticket.estatus}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">Prioridad</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${ticket.prioridad}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;">Descripción</td>
                            <td style="padding: 8px 0;">${ticket.descripcion}</td>
                            </tr>
                            ${ ticket.comentarios 
                              ? `<tr>
                                  <td style="padding: 8px 0;">Comentarios finales</td>
                                  <td style="padding: 8px 0;">${ticket.comentarios}</td>
                                </tr>` 
                              : ''}
                        </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr bgcolor="#f8f9fa" style="border-top: 4px solid #0a8e3d;">
                        <td style="padding: 20px 30px;">
                        <table style="width: 100%;">
                            <!-- Redes sociales -->
                            <tr>
                            <td style="padding: 20px 0; text-align: center;">
                                <table style="margin: 0 auto;">
                                <tr>
                                    <td style="padding: 0 8px;">
                                    <a href="https://www.facebook.com/bamxtepatitlan">
                                        <img src="https://cdn3.iconfinder.com/data/icons/social-media-black-white-2/512/BW_Facebook_glyph_svg-32.png" alt="Facebook">
                                    </a>
                                    </td>
                                    <td style="padding: 0 8px;">
                                    <a href="https://www.linkedin.com/company/bamxtepatitlan">
                                        <img src="https://cdn1.iconfinder.com/data/icons/social-media-circle-7/512/Circled_Linkedin_svg-32.png" alt="LinkedIn">
                                    </a>
                                    </td>
                                    <td style="padding: 0 8px;">
                                    <a href="https://www.instagram.com/bamxtepatitlan">
                                        <img src="https://cdn1.iconfinder.com/data/icons/social-media-circle-7/512/Circled_Instagram_svg-32.png" alt="Instagram">
                                    </a>
                                    </td>
                                    <td style="padding: 0 8px;">
                                    <a href="https://bamxtepatitlan.org">
                                        <img src="https://cdn1.iconfinder.com/data/icons/material-core/20/language-32.png" alt="Sitio web">
                                    </a>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>

                            <!-- Dirección -->
                            <tr>
                            <td style="padding: 15px 0; text-align: center; font-size: 14px; line-height: 1.5; color: #666;">
                                <b>Banco Diocesano de Alimentos de los Altos</b><br>
                                Terrerito 1326, Fraccionamiento La Puerta<br>
                                Tepatitlán de Morelos, Jalisco
                            </td>
                            </tr>

                            <!-- Aviso -->
                            <tr>
                            <td style="padding-top: 20px; text-align: center; font-size: 12px; color: #999;">
                                Si no te registraste en nuestra plataforma, por favor ignora este correo
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                </table>
            </table>
          </td>
        </tr>
      </table>
    </body>
  `;
};

module.exports = { generateTicketTemplate };