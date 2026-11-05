import { executionEmails } from './execution-emails';

const emails = (...names: string[]) =>
  names.map((name) => `${name}@istmania.hn`);
const common = emails('hector.contreras', 'reina.espinal');
const sps = emails(
  'ariana.garmendia',
  'kenia.alvarez',
  'eleasar.sagastume',
  'carolina.puerto',
  'cristian.caballero',
  'mario.george',
);
const tgu = emails(
  'andrea.castro',
  'robert.cabrera',
  'jorge.varela',
  'junior.osorto',
);

describe('Destinatarios de ejecución por zona y plan', () => {
  it.each(['PROMOCION', 'DESCUENTO'])(
    'incluye a Lissy para %s en ambas zonas',
    (type) => {
      for (const seller of ['S09', 'T04']) {
        expect(executionEmails(seller, [type])).toEqual(emails('lissy.flores'));
      }
    },
  );

  it('distingue los grupos de degustación', () => {
    expect(executionEmails('S09', ['DEGUSTACION'])).toEqual(
      emails('linda.morales', 'shirley.barrientos', 'denis.hernandez'),
    );
    expect(executionEmails(' t04 ', ['DEGUSTACION'])).toEqual(
      emails(
        'linda.morales',
        'nelly.gonzalez',
        'maria.zelaya',
        'claudia.perez',
      ),
    );
  });

  it('incluye operaciones de la zona y los contactos comunes para cambio por cambio', () => {
    expect(executionEmails('S09', ['CAMBIO'])).toEqual([...common, ...sps]);
    expect(executionEmails('T04', ['CAMBIO'])).toEqual([...common, ...tgu]);
  });

  it.each(['DEVOLUCION', 'NOTA_CREDITO'])(
    'añade los contactos exclusivos de %s',
    (type) => {
      expect(executionEmails('S09', [type])).toEqual([
        ...common,
        ...sps,
        ...emails('zoila.padilla', 'natalia.izaguirre'),
      ]);
      expect(executionEmails('T04', [type])).toEqual([
        ...common,
        ...tgu,
        ...emails('omar.caceres', 'gerardo.zelaya'),
      ]);
    },
  );

  it('combina varios planes sin duplicados ni contactos de otra zona', () => {
    const result = executionEmails('T04', [
      'CAMBIO',
      'DEVOLUCION',
      'DEGUSTACION',
      'PROMOCION',
      'DESCUENTO',
    ]);
    expect(result.length).toBe(new Set(result).size);
    expect(result).toEqual([
      ...common,
      ...tgu,
      ...emails(
        'omar.caceres',
        'gerardo.zelaya',
        'linda.morales',
        'nelly.gonzalez',
        'maria.zelaya',
        'claudia.perez',
        'lissy.flores',
      ),
    ]);
  });

  it('usa solo contactos comunes cuando no se puede determinar la zona', () => {
    for (const code of [
      undefined,
      '',
      'CHECKIN',
      '0120D947-F32E-4DE7-9E22-E8EBC73274D7',
    ]) {
      expect(
        executionEmails(code, ['CAMBIO', 'DEVOLUCION', 'DEGUSTACION']),
      ).toEqual([...common, ...emails('linda.morales')]);
    }
    expect(executionEmails('S09', ['REUBICACION', 'OTRO'])).toEqual([]);
  });
});
