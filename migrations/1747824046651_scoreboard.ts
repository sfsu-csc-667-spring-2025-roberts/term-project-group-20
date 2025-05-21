import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("scoreboard", {
    user_id: {
      type: "integer",
      notNull: true,
      references: '"users"',
    },
    game_id: {
      type: "integer",
      notNull: true,
      references: '"games"',
    },
    points: {
      type: "integer",
      notNull: true,
      default: 0,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("scoreboard");
}
