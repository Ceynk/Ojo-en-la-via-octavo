# Diagrama de secuencia — Crear un reporte

Flujo real según `ReportForm.tsx`, `IncidentAssistController`, `ReportDuplicateController`,
`ReportController::store` y los jobs `NotifyEntitiesOfReport` / `GenerateReportEmbedding`.

```mermaid
sequenceDiagram
    autonumber
    actor C as Ciudadano
    participant F as ReportForm (React)
    participant IA as IncidentAssistController
    participant DUP as ReportDuplicateController
    participant G as Servicios IA (Gemini)
    participant RC as ReportController
    participant DB as Base de datos
    participant Q as Cola de trabajos
    participant WS as Reverb (tiempo real)
    actor E as Entidad pública

    C->>F: Toma foto, escribe descripción y marca ubicación

    opt Asistente IA (al subir foto)
        F->>IA: POST /reportes/asistente-ia (foto, descripción)
        IA->>G: suggestClassification()
        G-->>IA: tipo de incidente sugerido
        IA-->>F: JSON con sugerencia
        F-->>C: Muestra tipo sugerido
    end

    C->>F: Pulsa "Enviar reporte"
    F->>DUP: POST /reportes/verificar-duplicados
    DUP->>DB: Reportes cercanos del mismo tipo
    DB-->>DUP: candidatos
    DUP->>G: findPossibleDuplicates() (similitud)
    G-->>DUP: posibles duplicados
    DUP-->>F: { duplicates }

    alt Hay posibles duplicados
        F-->>C: Modal "¿Es el mismo problema?"
        alt Es el mismo problema
            C->>F: Confirmar reporte existente
            F->>DUP: POST /reports/{id}/confirmar-duplicado
            DUP->>DB: Crea ReportConfirmation
            DUP-->>F: OK (no se crea reporte nuevo)
        else Continuar de todos modos
            C->>F: Continuar
            Note over F: Agrega possible_duplicate_of<br/>y duplicate_similarity
        end
    end

    F->>RC: POST /reports (datos + fotos/videos)
    RC->>RC: validate()
    RC->>DB: Crea Report (estado "pendiente")
    RC->>DB: Guarda ReportImage por cada archivo
    RC->>Q: dispatch NotifyEntitiesOfReport
    RC->>Q: dispatch GenerateReportEmbedding
    RC->>WS: broadcast ReportCreated
    WS-->>F: Nuevo reporte en el mapa (otros usuarios)
    RC-->>F: Redirect a inicio + "Reporte creado exitosamente"
    F-->>C: Mensaje de éxito

    par Procesos en segundo plano (cola)
        Q->>DB: Entidades activas para ese tipo de incidente
        Q->>DB: Notification para usuarios de la entidad
        Q-)E: Correo EntityNotificationMail
        Q->>DB: Report.status = "notificado"
    and
        Q->>G: generateEmbeddingForReport()
        G-->>Q: vector
        Q->>DB: Guarda ReportEmbedding
    end
```
