export type Mode = 'equal' | 'percentage' | 'fixed' | 'items';

export type Participant = { id: string; name: string; contactId: string | null };

export type ItemRow = { id: string; name: string; price: string; participantIds: string[] };
