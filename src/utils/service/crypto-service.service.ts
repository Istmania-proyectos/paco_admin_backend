/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey = process.env.KEY;

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.alloc(16, 0),
    );

    return Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]).toString('hex');
  }

  decrypt(hash: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.alloc(16, 0),
    );

    return Buffer.concat([
      decipher.update(Buffer.from(hash, 'hex')),
      decipher.final(),
    ]).toString();
  }
}
