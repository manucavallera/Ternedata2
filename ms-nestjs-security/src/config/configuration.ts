export default () => ({
    port: process.env.ENTORNO_ENV ==='produccion'? parseInt(process.env.PORT_PRODUCCION, 10) : parseInt(process.env.PORT_DESARROLLO, 10) ,
    cors:process.env.CORS_ORIGIN_DESARROLLO,
    secret:process.env.JWT_SECRET,
    database: {
      host: process.env.ENTORNO_ENV ==='produccion'? process.env.DB_HOST_PRODUCCION : process.env.DB_HOST_DESARROLLO  ,
      port: process.env.ENTORNO_ENV ==='produccion'? parseInt(process.env.DB_PORT_PRODUCCION) : parseInt(process.env.DB_PORT_DESARROLLO) ,
      username: process.env.ENTORNO_ENV ==='produccion'? process.env.DB_USERNAME_PRODUCCION : process.env.DB_USERNAME_DESARROLLO,
      password: process.env.ENTORNO_ENV ==='produccion'? process.env.DB_PASSWORD_PRODUCCION : process.env.DB_PASSWORD_DESARROLLO,
      name: process.env.ENTORNO_ENV ==='produccion'? process.env.DB_NAME_PRODUCCION : process.env.DB_NAME_DESARROLLO,
    }
  }); 