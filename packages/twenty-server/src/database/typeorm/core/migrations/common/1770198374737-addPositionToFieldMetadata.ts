import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPositionToFieldMetadata1770198374737 implements MigrationInterface {
  name = 'AddPositionToFieldMetadata1770198374737';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fieldMetadata" ADD "position" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fieldMetadata" DROP COLUMN "position"`);
  }
}
