import { SmtpMailerService } from './smtp-mailer.service';

describe('SmtpMailerService MIME', () => {
  it('codifica el HTML para que el servidor no parta los enlaces', () => {
    const service = new SmtpMailerService({ get: jest.fn() } as any);
    const link =
      'http://10.10.10.9:8081/paco-admin-front/#/ticket/aprobar?token=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
    const html = `<p><a href="${link}">Abrir ticket y responder</a></p>`;

    const mime = (service as any).mime('paco@test.local', {
      to: 'destino@test.local',
      subject: 'Ticket de prueba',
      html,
    });

    expect(mime).toContain('Content-Transfer-Encoding: base64');
    const encodedBody = mime.split('\r\n\r\n')[1];
    expect(
      encodedBody.split('\r\n').every((line: string) => line.length <= 76),
    ).toBe(true);
    expect(
      Buffer.from(encodedBody.replace(/\r\n/g, ''), 'base64').toString(),
    ).toBe(html);
  });
});
