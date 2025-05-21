import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("game_users", {
    user_id: {
      type: "integer",
      references: "users(id)",
    },
    game_id: {
      type: "integer",
      references: "games(id)",
    },
    is_current: {
      type: "boolean",
      default: false,
    },
    table_positon: {
      type: "integer",
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("game_users");
}
