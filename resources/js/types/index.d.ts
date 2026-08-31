export type DocumentType = 'CC' | 'TI' | 'CE' | 'PA';
export type Gender = 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir';

export interface User {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    document_type: DocumentType | null;
    document_number: string | null;
    address: string | null;
    neighborhood: string | null;
    birth_date: string | null;
    gender: Gender | null;
    role: 'ciudadano' | 'admin' | 'entity' | 'operator';
    entity_id: number | null;
    is_active: boolean;
    profile_photo: string | null;
    notify_by_email: boolean;
    last_login_at: string | null;
    current_latitude: number | null;
    current_longitude: number | null;
    location_updated_at: string | null;
    created_at: string;
    reports_count?: number;
    comments_count?: number;
    likes_count?: number;
    resolved_reports_count?: number;
    entity?: Pick<Entity, 'id' | 'name'>;
}

export interface Entity {
    id: number;
    name: string;
    description: string | null;
    entity_email: string | null;
    is_active: boolean;
    subject_template: string | null;
    message_template: string | null;
    priority: 'alta' | 'media' | 'baja';
    logo_path: string | null;
    motto: string | null;
    website_url: string | null;
    created_at: string;
    incident_types?: IncidentType[];
    users?: Pick<User, 'id' | 'entity_id' | 'first_name' | 'last_name' | 'email' | 'is_active'>[];
}

export interface EntityNotification {
    id: number;
    report_id: number;
    entity_email: string;
    subject: string;
    message: string;
    priority: 'alta' | 'media' | 'baja';
    status: 'enviada' | 'vista' | 'actualizada';
    created_at: string;
}

export interface IncidentType {
    id: number;
    name: string;
}

export type ReportStatus = 'pendiente' | 'notificado' | 'en_camino' | 'en_revision' | 'en_proceso' | 'resuelto';

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
    claimed_by_user_id: number | null;
    claimed_at: string | null;
    possible_duplicate_of: number | null;
    duplicate_similarity: number | null;
    created_at: string;
    updated_at: string;
    user?: User;
    incident_type?: IncidentType;
    claimed_by?: Pick<User, 'id' | 'name'>;
    images?: ReportImage[];
    likes_count?: number;
    comments_count?: number;
    user_liked?: boolean;
    status_history?: ReportStatusHistory[];
    original_report?: Pick<Report, 'id' | 'description'>;
}

export interface ReportImage {
    id: number;
    report_id: number;
    path: string;
    type: 'image' | 'video';
    kind: 'reporte' | 'evidencia';
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
    report?: Pick<Report, 'id' | 'description' | 'incident_type_id'>;
}

export type NotificationType =
    | 'comentario'
    | 'respuesta_comentario'
    | 'like_reporte'
    | 'like_comentario'
    | 'estado_reporte'
    | 'admin_mensaje'
    | 'nuevo_reporte_entidad'
    | 'comentario_entidad';

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

export interface ReportStatusHistory {
    id: number;
    report_id: number;
    previous_status: ReportStatus;
    new_status: ReportStatus;
    changed_by_user_id: number | null;
    notes: string | null;
    created_at: string;
    changed_by?: User;
    report?: Pick<Report, 'id' | 'description' | 'incident_type_id'>;
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
