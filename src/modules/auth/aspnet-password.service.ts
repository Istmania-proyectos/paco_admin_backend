import { Injectable } from '@nestjs/common';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class AspNetPasswordService {
  hash(password: string): string {
    const salt = randomBytes(16);
    const subkey = pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const output = Buffer.alloc(61);

    output[0] = 0x01;
    output.writeUInt32BE(1, 1);
    output.writeUInt32BE(10000, 5);
    output.writeUInt32BE(salt.length, 9);
    salt.copy(output, 13);
    subkey.copy(output, 29);

    return output.toString('base64');
  }

  verify(hash: string, password: string): boolean {
    if (!hash || !password) return false;

    try {
      const decoded = Buffer.from(hash, 'base64');
      if (decoded[0] === 0x00) return this.verifyV2(decoded, password);
      if (decoded[0] === 0x01) return this.verifyV3(decoded, password);
      return false;
    } catch {
      return false;
    }
  }

  private verifyV2(decoded: Buffer, password: string): boolean {
    if (decoded.length !== 49) return false;
    const actual = pbkdf2Sync(
      password,
      decoded.subarray(1, 17),
      1000,
      32,
      'sha1',
    );
    return timingSafeEqual(actual, decoded.subarray(17));
  }

  private verifyV3(decoded: Buffer, password: string): boolean {
    if (decoded.length < 29) return false;

    const prf = decoded.readUInt32BE(1);
    const iterations = decoded.readUInt32BE(5);
    const saltLength = decoded.readUInt32BE(9);
    const digest = prf === 0 ? 'sha1' : prf === 2 ? 'sha512' : 'sha256';
    const expected = decoded.subarray(13 + saltLength);
    const actual = pbkdf2Sync(
      password,
      decoded.subarray(13, 13 + saltLength),
      iterations,
      expected.length,
      digest,
    );

    return timingSafeEqual(actual, expected);
  }
}
