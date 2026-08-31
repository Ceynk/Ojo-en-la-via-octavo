<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Restablecer contraseña</title>
</head>
<body style="margin:0; padding:0; background-color:#0b1120; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120; padding:32px 16px;">
<tr>
<td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#0f172a; border-radius:16px; overflow:hidden; border:1px solid #1e293b;">

    {{-- Header --}}
    <tr>
        <td style="background-color:#0c1425; padding:24px 32px; border-bottom:1px solid #1e293b;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td>
                        <span style="font-size:15px; font-weight:700; color:#f8fafc; white-space:nowrap;">Ojo en la Vía</span>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    {{-- Body --}}
    <tr>
        <td style="padding:32px;">
            <p style="margin:0 0 4px; font-size:13px; color:#60a5fa; font-weight:600; letter-spacing:.02em;">RESTABLECER CONTRASEÑA</p>
            <h1 style="margin:0 0 16px; font-size:21px; line-height:1.3; color:#f8fafc;">Hola, {{ $userName }}</h1>
            <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#cbd5e1;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente botón para elegir una nueva contraseña.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="border-radius:10px; background-color:#2563eb;">
                        <a href="{{ $resetUrl }}" style="display:inline-block; padding:13px 26px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                            Restablecer contraseña →
                        </a>
                    </td>
                </tr>
            </table>

            <p style="margin:24px 0 0; font-size:12px; color:#64748b; line-height:1.6;">
                Este enlace expira en 1 hora. Si tú no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual seguirá funcionando.
            </p>

            <p style="margin:20px 0 0; font-size:12px; color:#475569; line-height:1.6; word-break:break-all;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <span style="color:#60a5fa;">{{ $resetUrl }}</span>
            </p>
        </td>
    </tr>

    {{-- Footer --}}
    <tr>
        <td style="padding:20px 32px; border-top:1px solid #1e293b;">
            <p style="margin:0; font-size:11px; color:#475569; line-height:1.6;">
                Recibiste este correo porque tu cuenta en Ojo en la Vía está asociada a esta dirección.
            </p>
        </td>
    </tr>

</table>
</td>
</tr>
</table>
</body>
</html>
