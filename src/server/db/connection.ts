// import pgp from "pg-promise";

// const connection = pgp()(process.env.DATABASE_URL!);

// export default connection;

// // import dotenv from "dotenv";
// // dotenv.config();
// // console.log("Database URL (from connection.ts):", process.env.DATABASE_URL);
// import dotenv from "dotenv";
// dotenv.config();

// console.log("DATABASE_URL (from connection.ts):", process.env.DATABASE_URL);
import pgp from "pg-promise";
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:qq1234@localhost:5432/spring-2025";

const connection = pgp()(connectionString);

export default connection;
