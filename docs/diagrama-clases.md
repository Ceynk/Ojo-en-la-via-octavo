# Diagrama de clases — Ojo en la Vía

Generado a partir de `app/Models`, `app/Services`, `app/Events` y `app/Policies`.

## 1. Modelo de dominio

```mermaid
classDiagram
    direction LR

    class User {
        +int id
        +int? entity_id
        +string first_name
        +string last_name
        +string email
        +string phone
        +string document_type
        +string document_number
        +string address
        +string neighborhood
        +date birth_date
        +string gender
        +string password
        +string role
        +bool is_active
        +string profile_photo
        +bool notify_by_email
        +datetime last_login_at
        +float current_latitude
        +float current_longitude
        +datetime location_updated_at
        +string name «calculado»
        +isAdmin() bool
        +isOperator() bool
        +isEntityUser() bool
    }

    class Entity {
        +int id
        +string name
        +string description
        +string entity_email
        +bool is_active
        +string subject_template
        +string message_template
        +string priority
        +string logo_path
        +string motto
        +string website_url
        +scopeActive(query) Builder
        +scopeForIncidentType(query, incidentTypeId) Builder
        +renderMessage(Report) array
    }

    class IncidentType {
        +int id
        +string name
    }

    class Report {
        +int id
        +int user_id
        +int incident_type_id
        +string description
        +ReportStatus status
        +float latitude
        +float longitude
        +string address_text
        +bool is_edited
        +datetime edited_at
        +int? claimed_by_user_id
        +datetime claimed_at
        +int? possible_duplicate_of
        +float duplicate_similarity
    }

    class ReportStatus {
        <<enumeration>>
        pendiente
        en_revision
        notificado
        en_camino
        en_proceso
        resuelto
    }

    class ReportImage {
        +int id
        +int report_id
        +string path
        +string type
        +string kind
    }

    class ReportStatusHistory {
        +int id
        +int report_id
        +string previous_status
        +string new_status
        +int changed_by_user_id
        +string notes
    }

    class ReportConfirmation {
        +int id
        +int report_id
        +int user_id
    }

    class ReportEmbedding {
        +int id
        +int report_id
        +array embedding
        +string model
        +datetime created_at
    }

    class Comment {
        +int id
        +int report_id
        +int user_id
        +int? parent_id
        +string body
        +bool is_edited
        +bool is_deleted
        +datetime edited_at
    }

    class Like {
        +int id
        +int user_id
        +string likeable_type
        +int likeable_id
    }

    class Notification {
        +int id
        +int user_id
        +int? actor_id
        +string type
        +string title
        +string message
        +int? report_id
        +int? comment_id
        +datetime read_at
        +isRead() bool
        +markAsRead() void
    }

    class EntityNotification {
        +int id
        +int report_id
        +string entity_email
        +string subject
        +string message
        +string priority
        +string status
    }

    %% Usuarios y entidades
    Entity "0..1" o-- "*" User : pertenece a
    Entity "*" -- "*" IncidentType : atiende (entity_incident_type)

    %% Reportes
    User "1" --> "*" Report : crea
    User "0..1" --> "*" Report : reclama (claimedBy)
    IncidentType "1" --> "*" Report : clasifica
    Report --> ReportStatus : status
    Report "1" *-- "*" ReportImage : images
    Report "1" *-- "*" ReportStatusHistory : statusHistory
    Report "1" *-- "*" ReportConfirmation : confirmations
    Report "1" *-- "0..1" ReportEmbedding : embedding
    Report "0..1" <-- "*" Report : originalReport (posible duplicado)
    ReportStatusHistory "*" --> "1" User : changedBy
    ReportConfirmation "*" --> "1" User : confirma

    %% Interacción social
    Report "1" *-- "*" Comment : comments
    User "1" --> "*" Comment : escribe
    Comment "0..1" <-- "*" Comment : replies (parent)
    User "1" --> "*" Like : da
    Like "*" --> "1" Report : likeable (polimórfico)
    Like "*" --> "1" Comment : likeable (polimórfico)

    %% Notificaciones
    User "1" --> "*" Notification : recibe
    User "0..1" <-- "*" Notification : actor
    Notification "*" --> "0..1" Report
    Notification "*" --> "0..1" Comment
    Report "1" --> "*" EntityNotification : entityNotifications
```

## 2. Servicios, eventos y políticas

```mermaid
classDiagram
    direction LR

    class NotificationService {
        +create(userId, actorId, type, title, message, reportId, commentId) Notification
        +notifyStatusChange(reportOwnerId, reportId, newStatus, incidentTypeName, actorId) void
        +notifyEntityNewReport(Entity, Report) void
        +notifyEntityNewComment(Entity, Report, Comment, actorId) void
    }

    class GeminiClient {
        +generateContent(contents, responseSchema, model) array
        +embedContent(content, model) array
        #post(path, payload) array
        #redactApiKey(message) string
    }

    class GeminiException
    Exception <|-- GeminiException

    class DuplicateDetectionService {
        -GeminiClient client
        +generateEmbeddingForReport(Report) array
        +findPossibleDuplicates(...) array
        -embed(description, photo, mime) array
        -candidateReports(incidentTypeId, lat, lng, radius, daysBack)
        -haversineMeters(lat1, lng1, lat2, lng2) float
        -cosineSimilarity(a, b) float
    }

    class IncidentAssistService {
        -GeminiClient client
        +suggestClassification(description, photo, mime) array
        -buildPrompt(description, hasPhoto) string
        -responseSchema() array
    }

    class ShouldBroadcastNow {
        <<interface>>
        +broadcastOn()
        +broadcastAs() string
        +broadcastWith() array
    }
    class ReportCreated { +Report report }
    class ReportStatusChanged { +Report report }
    class OperatorLocationUpdated { +User operator }
    ShouldBroadcastNow <|.. ReportCreated
    ShouldBroadcastNow <|.. ReportStatusChanged
    ShouldBroadcastNow <|.. OperatorLocationUpdated

    class ReportPolicy {
        +update(User, Report) bool
        +delete(User, Report) bool
    }
    class CommentPolicy {
        +update(User, Comment) bool
        +delete(User, Comment) bool
    }
    class NotificationPolicy {
        +update(User, Notification) bool
    }

    DuplicateDetectionService --> GeminiClient : usa
    IncidentAssistService --> GeminiClient : usa
    GeminiClient ..> GeminiException : lanza
    DuplicateDetectionService ..> Report
    DuplicateDetectionService ..> ReportEmbedding
    NotificationService ..> Notification : crea
    NotificationService ..> Entity
    ReportCreated ..> Report
    ReportStatusChanged ..> Report
    OperatorLocationUpdated ..> User
    ReportPolicy ..> Report
    CommentPolicy ..> Comment
    NotificationPolicy ..> Notification
```

## Notas

- Todos los modelos heredan de `Illuminate\Database\Eloquent\Model`; `User` hereda de `Authenticatable`.
- `User.role` toma los valores `ciudadano`, `admin`, `operator` y `entity`.
- `Like` es una relación polimórfica (`likeable`): puede apuntar a un `Report` o a un `Comment`.
- `Report.comments` devuelve solo comentarios de primer nivel; las respuestas se anidan con `parent_id`.
