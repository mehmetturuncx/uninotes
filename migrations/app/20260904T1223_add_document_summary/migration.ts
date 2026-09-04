#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/13fe3b5005fc7fbeaac1583fcff5ba782c1073c9d75b1850a78decdfd2d5865b/contract';
import endContract from '../../snapshots/13fe3b5005fc7fbeaac1583fcff5ba782c1073c9d75b1850a78decdfd2d5865b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9359a1a679a8a4d148deb9e8709e54b97531735187a930e95a64e8496dac9de1/contract';
import startContract from '../../snapshots/9359a1a679a8a4d148deb9e8709e54b97531735187a930e95a64e8496dac9de1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'conversation' }),
      this.dropTable({ schema: 'public', table: 'message' }),
      this.addColumn({
        schema: 'public',
        table: 'document',
        column: col('summary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
