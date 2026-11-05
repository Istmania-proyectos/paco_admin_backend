const address = (names: string[]) => names.map((name) => `${name}@istmania.hn`);

const commonOperations = address(['hector.contreras', 'reina.espinal']);
const operations = {
  SPS: address([
    'ariana.garmendia',
    'kenia.alvarez',
    'eleasar.sagastume',
    'carolina.puerto',
    'cristian.caballero',
    'mario.george',
  ]),
  TGU: address([
    'andrea.castro',
    'robert.cabrera',
    'jorge.varela',
    'junior.osorto',
  ]),
};

/** Unknown seller prefixes receive only recipients shared by both zones. */
export function executionEmails(
  sellerCode: string | null | undefined,
  types: string[],
): string[] {
  const prefix = sellerCode?.trim().toUpperCase().charAt(0);
  const zone = prefix === 'S' ? 'SPS' : prefix === 'T' ? 'TGU' : undefined;
  const result: string[] = [];
  for (const type of types) {
    if (type === 'PROMOCION' || type === 'DESCUENTO') {
      result.push(...address(['lissy.flores']));
    }
    if (type === 'DEGUSTACION') {
      result.push(...address(['linda.morales']));
      if (zone === 'SPS')
        result.push(...address(['shirley.barrientos', 'denis.hernandez']));
      if (zone === 'TGU')
        result.push(
          ...address(['nelly.gonzalez', 'maria.zelaya', 'claudia.perez']),
        );
    }
    if (['CAMBIO', 'DEVOLUCION', 'NOTA_CREDITO'].includes(type)) {
      result.push(...commonOperations);
      if (zone) result.push(...operations[zone]);
      if (type !== 'CAMBIO') {
        if (zone === 'SPS')
          result.push(...address(['zoila.padilla', 'natalia.izaguirre']));
        if (zone === 'TGU')
          result.push(...address(['omar.caceres', 'gerardo.zelaya']));
      }
    }
  }
  return [...new Set(result)];
}
