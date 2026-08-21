<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $subject }}</title>
</head>
<body style="margin:0; padding:0; background-color:#0b1120; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120; padding:32px 16px;">
<tr>
<td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#0f172a; border-radius:16px; overflow:hidden; border:1px solid #1e293b;">

    {{-- Header --}}
    <tr>
        <td style="background-color:#0c1425; padding:24px 32px; border-bottom:1px solid #1e293b;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td>
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td>
                                    <span style="font-size:15px; font-weight:700; color:#f8fafc; white-space:nowrap;">Ojo en la Vía</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td align="right">
                        <span style="display:inline-block; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; background-color:{{ $priorityBg }}; color:{{ $priorityText }};">
                            Prioridad {{ $priorityLabel }}
                        </span>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    {{-- Body --}}
    <tr>
        <td style="padding:32px;">
            <p style="margin:0 0 4px; font-size:13px; color:#60a5fa; font-weight:600; letter-spacing:.02em;">NUEVO REPORTE PARA {{ mb_strtoupper($entityName) }}</p>
            <h1 style="margin:0 0 16px; font-size:21px; line-height:1.3; color:#f8fafc;">Hola{{ $recipientName ? ", {$recipientName}" : '' }}</h1>
            <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#cbd5e1;">
                {{ $bodyMessage }}
            </p>

            @if($imageFile)
            <div style="margin:0 0 20px; border-radius:12px; overflow:hidden; border:1px solid #1e293b;">
                <img src="{{ $imageFile }}" alt="Foto del reporte" width="496" style="display:block; width:100%; max-height:280px; object-fit:cover;">
            </div>
            @endif

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#131c31; border:1px solid #1e293b; border-radius:12px; margin:0 0 24px;">
                <tr>
                    <td style="padding:16px 20px; border-bottom:1px solid #1e293b;">
                        <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#64748b;">Tipo de incidente</p>
                        <p style="margin:0; font-size:14px; color:#f1f5f9; font-weight:600;">{{ $incidentTypeName }}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 20px; border-bottom:1px solid #1e293b;">
                        <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#64748b;">Dirección</p>
                        <p style="margin:0; font-size:14px; color:#f1f5f9;">{{ $addressText }}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 20px;">
                        <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#64748b;">Descripción del ciudadano</p>
                        <p style="margin:0; font-size:14px; color:#f1f5f9; line-height:1.5;">{{ $description }}</p>
                    </td>
                </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="border-radius:10px; background-color:#2563eb;">
                        <a href="{{ $loginUrl }}" style="display:inline-block; padding:13px 26px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                            Ir al panel de entidad →
                        </a>
                    </td>
                </tr>
            </table>
            <p style="margin:16px 0 0; font-size:12px; color:#64748b;">
                Desde el panel puedes marcar este reporte como "en revisión" o "resuelto" y dejar notas de seguimiento.
            </p>
        </td>
    </tr>

    {{-- Footer --}}
    <tr>
        <td style="padding:20px 32px; border-top:1px solid #1e293b;">
            <p style="margin:0; font-size:11px; color:#475569; line-height:1.6;">
                Recibiste este correo porque tu cuenta o el buzón de contacto de <strong style="color:#64748b;">{{ $entityName }}</strong> está registrado en Ojo en la Vía para el tipo de incidente "{{ $incidentTypeName }}".
            </p>
        </td>
    </tr>

</table>
</td>
</tr>
</table>
</body>
</html>
