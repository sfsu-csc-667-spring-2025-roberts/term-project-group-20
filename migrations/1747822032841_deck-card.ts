import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("deck_card", {
    id: "id",
    color: { type: "varchar" },
    type: { type: "varchar" },
    value: { type: "integer" },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("deck_card");
}
