export type Mode = 'equal' | 'percentage' | 'fixed' | 'items';

// `id` es una clave estable de cliente (no es el contactId): permite usar keys
// de React confiables y referenciar participantes sin depender del índice del
// array, que se corre al agregar/quitar gente.
export type Participant = { id: string; name: string; contactId: string | null };

export type ItemRow = { id: string; name: string; price: string; participantIds: string[] };
