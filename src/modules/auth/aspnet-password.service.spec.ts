import { AspNetPasswordService } from './aspnet-password.service';

describe('AspNetPasswordService', () => {
  const service = new AspNetPasswordService();

  it('genera un hash ASP.NET Identity v3 verificable', () => {
    const hash = service.hash('test123');

    expect(service.verify(hash, 'test123')).toBe(true);
    expect(service.verify(hash, 'incorrecta')).toBe(false);
  });

  it('rechaza hashes inválidos', () => {
    expect(service.verify('', 'test123')).toBe(false);
    expect(service.verify('no-es-un-hash', 'test123')).toBe(false);
  });
});
