const generatePasswordResetTemplate = (token) =>  {
    return `<body link="#00a5b5" vlink="#00a5b5" alink="#00a5b5">
    <table class="main contenttable" align="center" style="font-weight: normal;border-collapse: collapse;border: 0;margin-left: auto;margin-right: auto;padding: 0;font-family: Arial, sans-serif;color: #555559;background-color: white;font-size: 16px;line-height: 26px;width: 600px;">
        <tr>
        <td class="border" style="border-collapse: collapse;border: 1px solid #eeeff0;margin: 0;padding: 0;-webkit-text-size-adjust: none;color: #555559;font-family: Arial, sans-serif;font-size: 16px;line-height: 26px;">
            <table style="font-weight: normal;border-collapse: collapse;border: 0;margin: 0;padding: 0;font-family: Arial, sans-serif;width: 100%;">
            <!-- Encabezado -->
            <tr>
                <td colspan="4" valign="top" class="image-section" style="border-collapse: collapse;border: 0;margin: 0;padding: 0;-webkit-text-size-adjust: none;color: #555559;font-family: Arial, sans-serif;font-size: 16px;line-height: 26px;background-color: #fff;border-bottom: 4px solid #0a8e3d; text-align: center;">
                <a href="https://bamxtepatitlan.org"><img class="top-image" src="https://bamxtepatitlan.org/assets/logo-B5cTjWox.png" style="width: 100px; margin:20px auto; display: block;" alt="BAMX Tepatitlán logo"></a>
                </td>
            </tr>

            <!-- Contenido principal -->
            <tr>
                <td style="padding: 20px 30px;">
                <table style="width: 100%;">
                    <tr>
                    <td style="text-align: center; padding-bottom: 15px;">
                        <h1 style="font-size: 28px; margin: 0; color: #0a8e3d;">Restablece tu contraseña</h1>
                    </td>
                    </tr>
                    <tr>
                    <td style="padding: 10px 0;">
                        <p>Este enlace expirará en 1 hora</p>
                    </td>
                    </tr>
                    <tr>
                    <td style="padding: 25px 0; text-align: center;">
                        <a href="https://pedidos.bamxtepatitlan.org/resetPassword/${token}" 
                        style="background-color: #ff8300; color: #ffffff; padding: 12px 30px; 
                                text-decoration: none; border-radius: 4px; display: inline-block;
                                font-weight: bold; font-size: 16px;">
                        Restablecer contraseña
                        </a>
                    </td>
                    </tr>
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
        </td>
        </tr>
    </table>
    </body>
    `;
};

module.exports = { generatePasswordResetTemplate };