/** NOTA_CREDITO remains an accepted alias for older clients. */
export function serializeTicketAction(action: unknown): string {
  return JSON.stringify(action, (key, value) =>
    key === 'tipoAccion' && value === 'NOTA_CREDITO' ? 'DEVOLUCION' : value,
  );
}

export function ticketActionLabel(value?: string): string {
  if (value === 'DEVOLUCION' || value === 'NOTA_CREDITO') {
    return 'Devolución/NC (nota crédito)';
  }
  return value?.replace(/_/g, ' ') ?? '';
}
