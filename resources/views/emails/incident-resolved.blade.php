<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Incidente resuelto</title>
</head>
<body style="margin:0; padding:0; background-color:#0b1120; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120; padding:32px 16px;">
<tr>
<td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#0f172a; border-radius:16px; overflow:hidden; border:1px solid #1e293b;">

    {{-- Header --}}
    <tr>
        <td style="background-color:#0c1425; padding:24px 32px; border-bottom:1px solid #1e293b;">
            <span style="font-size:15px; font-weight:700; color:#f8fafc; white-space:nowrap;">Ojo en la Vía</span>
        </td>
    </tr>

    {{-- Body --}}
    <tr>
        <td style="padding:32px;">
            <p style="margin:0 0 4px; font-size:13px; color:#34d399; font-weight:600; letter-spacing:.02em;">INCIDENTE RESUELTO</p>
            <h1 style="margin:0 0 16px; font-size:21px; line-height:1.3; color:#f8fafc;">Un reporte de {{ $incidentTypeName }} fue resuelto</h1>
            <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#cbd5e1;">
                El incidente reportado en <strong style="color:#f1f5f9;">{{ $addressText }}</strong> ya fue atendido por {{ $entityName }}. Puedes ver el reporte, su historial y la evidencia de la resolución en la plataforma.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="border-radius:10px; background-color:#2563eb;">
                        <a href="{{ $reportUrl }}" style="display:inline-block; padding:13px 26px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                            Ver reporte →
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    {{-- Footer --}}
    <tr>
        <td style="padding:20px 32px; border-top:1px solid #1e293b;">
            <p style="margin:0; font-size:11px; color:#475569; line-height:1.6;">
                Recibiste este correo porque tienes una cuenta activa en Ojo en la Vía.
            </p>
        </td>
    </tr>

</table>
</td>
</tr>
</table>
</body>
</html>
