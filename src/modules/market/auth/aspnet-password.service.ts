import { Injectable } from '@nestjs/common';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class AspNetPasswordService {
  hashPassword(password: string) {
    const salt = randomBytes(16);
    const subkey = pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const output = Buffer.alloc(13 + salt.length + subkey.length);

    output[0] = 0x01;
    this.writeUInt32NetworkByteOrder(output, 1, 1);
    this.writeUInt32NetworkByteOrder(output, 5, 10000);
    this.writeUInt32NetworkByteOrder(output, 9, salt.length);
    salt.copy(output, 13);
    subkey.copy(output, 13 + salt.length);

    return output.toString('base64');
  }

  verifyPassword(hash: string, password: string) {
    if (!hash || !password) {
      return false;
    }

    const decoded = Buffer.from(hash, 'base64');
    if (decoded.length === 0) {
      return false;
    }

    if (decoded[0] === 0x00) {
      return this.verifyVersion2(decoded, password);
    }

    if (decoded[0] === 0x01) {
      return this.verifyVersion3(decoded, password);
    }

    return false;
  }

  private verifyVersion2(decoded: Buffer, password: string) {
    if (decoded.length !== 49) {
      return false;
    }

    const salt = decoded.subarray(1, 17);
    const expectedSubkey = decoded.subarray(17);
    const actualSubkey = pbkdf2Sync(password, salt, 1000, 32, 'sha1');

    return timingSafeEqual(actualSubkey, expectedSubkey);
  }

  private verifyVersion3(decoded: Buffer, password: string) {
    if (decoded.length < 13) {
      return false;
    }

    const prf = this.readUInt32NetworkByteOrder(decoded, 1);
    const iterCount = this.readUInt32NetworkByteOrder(decoded, 5);
    const saltLength = this.readUInt32NetworkByteOrder(decoded, 9);

    if (saltLength < 16 || decoded.length < 13 + saltLength) {
      return false;
    }

    const salt = decoded.subarray(13, 13 + saltLength);
    const expectedSubkey = decoded.subarray(13 + saltLength);
    const digest = this.getDigest(prf);
    const actualSubkey = pbkdf2Sync(
      password,
      salt,
      iterCount,
      expectedSubkey.length,
      digest,
    );

    return timingSafeEqual(actualSubkey, expectedSubkey);
  }

  private getDigest(prf: number) {
    if (prf === 0) {
      return 'sha1';
    }

    if (prf === 1) {
      return 'sha256';
    }

    if (prf === 2) {
      return 'sha512';
    }

    return 'sha256';
  }

  private readUInt32NetworkByteOrder(buffer: Buffer, offset: number) {
    return buffer.readUInt32BE(offset);
  }

  private writeUInt32NetworkByteOrder(
    buffer: Buffer,
    offset: number,
    value: number,
  ) {
    buffer.writeUInt32BE(value, offset);
  }
}
