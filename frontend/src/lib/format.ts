const dateFmt = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export const statusTone = (meaning: string) =>
  meaning === 'completed' ? 'complete' : meaning === 'new' ? 'new' : meaning === 'waiting_customer' ? 'waiting'
    : meaning === 'cancelled' || meaning === 'failed' ? 'closed' : 'progress';
