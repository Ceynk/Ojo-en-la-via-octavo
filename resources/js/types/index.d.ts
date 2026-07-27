export interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: 'ciudadano' | 'admin';
    is_active: boolean;
    profile_photo: string | null;
    created_at: string;
    reports_count?: number;
}

export interface EntityNotification {
    id: number;
    report_id: number;
    entity_email: string;
    token_used: boolean;
    token_expires_at: string;
    created_at: string;
}

export interface IncidentType {
    id: number;
    name: string;
}

export type ReportStatus = 'pendiente' | 'en_revision' | 'notificado' | 'resuelto';

export interface Report {
    id: number;
    user_id: number;
    incident_type_id: number;
    description: string;
    status: ReportStatus;
    latitude: number;
    longitude: number;
    address_text: string;
    is_edited: boolean;
    edited_at: string | null;
    created_at: string;
    updated_at: string;
    user?: User;
    incident_type?: IncidentType;
    images?: ReportImage[];
    likes_count?: number;
    comments_count?: number;
    user_liked?: boolean;
}

export interface ReportImage {
    id: number;
    report_id: number;
    path: string;
    created_at: string;
}

export interface Comment {
    id: number;
    report_id: number;
    user_id: number;
    parent_id: number | null;
    body: string | null;
    is_edited: boolean;
    is_deleted: boolean;
    edited_at: string | null;
    created_at: string;
    user?: User;
    replies?: Comment[];
    likes_count?: number;
    user_liked?: boolean;
}

export type NotificationType =
    | 'comentario'
    | 'respuesta_comentario'
    | 'like_reporte'
    | 'like_comentario'
    | 'estado_reporte'
    | 'admin_mensaje';

export interface Notification {
    id: number;
    user_id: number;
    actor_id: number | null;
    type: NotificationType;
    title: string;
    message: string;
    report_id: number | null;
    comment_id: number | null;
    read_at: string | null;
    created_at: string;
    actor?: User;
    report?: Pick<Report, 'id' | 'description' | 'status'>;
}

export interface NotificationRule {
    id: number;
    incident_type_id: number;
    entity_email: string;
    subject_template: string;
    message_template: string;
    priority: 'alta' | 'media' | 'baja';
    is_active: boolean;
    created_at: string;
    incident_type?: IncidentType;
}

export interface ReportStatusHistory {
    id: number;
    report_id: number;
    previous_status: ReportStatus;
    new_status: ReportStatus;
    changed_by_user_id: number | null;
    changed_by_entity: string | null;
    notes: string | null;
    created_at: string;
    changed_by?: User;
}

export interface PageProps {
    auth: {
        user: User | null;
    };
    flash: {
        success?: string;
        error?: string;
        info?: string;
    };
    notifications_count: number;
    incident_types: IncidentType[];
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: { url: string | null; label: string; active: boolean }[];
}
