import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { CredentialStatus } from '../shared/ipc.ts';

export interface EncryptedStore {
  read(): Promise<Uint8Array | undefined>;
  write(value: Uint8Array): Promise<void>;
  remove(): Promise<void>;
}

export interface TokenCrypto {
  available(): boolean;
  encrypt(plainText: string): Uint8Array;
  decrypt(cipherText: Uint8Array): string;
}

export class FileEncryptedStore implements EncryptedStore {
  constructor(private readonly path: string) {}

  async read(): Promise<Uint8Array | undefined> {
    try {
      return await readFile(this.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async write(value: Uint8Array): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${String(process.pid)}.tmp`;
    await writeFile(temporary, value, { mode: 0o600 });
    await rename(temporary, this.path);
  }

  async remove(): Promise<void> {
    await rm(this.path, { force: true });
  }
}

export class TokenVault {
  constructor(
    private readonly encryptedStore: EncryptedStore,
    private readonly crypto: TokenCrypto,
  ) {}

  async store(token: string): Promise<CredentialStatus> {
    if (!this.crypto.available()) throw new Error('Güvenli işletim sistemi anahtar deposu kullanılamıyor.');
    if (!token.trim()) throw new Error('API anahtarı boş olamaz.');
    await this.encryptedStore.write(this.crypto.encrypt(token));
    return this.status();
  }

  async clear(): Promise<CredentialStatus> {
    await this.encryptedStore.remove();
    return this.status();
  }

  async status(): Promise<CredentialStatus> {
    return { configured: (await this.encryptedStore.read()) !== undefined, secureStorageAvailable: this.crypto.available() };
  }

  async readForMainProcess(): Promise<string | undefined> {
    const encrypted = await this.encryptedStore.read();
    if (encrypted === undefined) return undefined;
    if (!this.crypto.available()) throw new Error('Güvenli işletim sistemi anahtar deposu kullanılamıyor.');
    return this.crypto.decrypt(encrypted);
  }
}
