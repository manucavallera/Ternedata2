import 'dotenv/config';
import { DataSource } from 'typeorm';

const produccion = process.env.ENTORNO_ENV === 'produccion';

const env = (desarrollo: string, produccionKey: string) =>
  process.env[produccion ? produccionKey : desarrollo];

const dataSource = new DataSource({
  type: 'postgres',
  host: env('DB_HOST_DESARROLLO', 'DB_HOST_PRODUCCION'),
  port: Number(env('DB_PORT_DESARROLLO', 'DB_PORT_PRODUCCION') || 5432),
  username: env('DB_USERNAME_DESARROLLO', 'DB_USERNAME_PRODUCCION'),
  password: env('DB_PASSWORD_DESARROLLO', 'DB_PASSWORD_PRODUCCION'),
  database: env('DB_NAME_DESARROLLO', 'DB_NAME_PRODUCCION'),
  entities: ['src/modules/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  ssl: false,
});

export default dataSource;
