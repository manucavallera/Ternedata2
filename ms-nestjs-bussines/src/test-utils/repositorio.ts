// Dobles de repositorio y QueryBuilder de TypeORM para tests de servicios.
// Cada método es un jest.fn() que devuelve valores neutros; el test pisa los que le importan.
export const queryBuilderFalso = (
  resultado: { uno?: unknown; muchos?: unknown[] } = {},
) => {
  const qb: Record<string, jest.Mock> = {};
  for (const metodo of [
    'leftJoinAndSelect',
    'leftJoin',
    'innerJoinAndSelect',
    'loadRelationCountAndMap',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'orWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'groupBy',
  ]) {
    qb[metodo] = jest.fn().mockReturnValue(qb);
  }
  qb.getOne = jest.fn().mockResolvedValue(resultado.uno ?? null);
  qb.getMany = jest.fn().mockResolvedValue(resultado.muchos ?? []);
  qb.getManyAndCount = jest
    .fn()
    .mockResolvedValue([
      resultado.muchos ?? [],
      (resultado.muchos ?? []).length,
    ]);
  qb.getCount = jest.fn().mockResolvedValue((resultado.muchos ?? []).length);
  return qb;
};

export const repositorioFalso = (qb = queryBuilderFalso()) => ({
  createQueryBuilder: jest.fn(() => qb),
  findOne: jest.fn().mockResolvedValue(null),
  findBy: jest.fn().mockResolvedValue([]),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((d) => d),
  save: jest.fn(async (d) => d),
  remove: jest.fn(async (d) => d),
  delete: jest.fn(),
  update: jest.fn(),
  query: jest.fn().mockResolvedValue([]),
});

// Status HTTP de la excepción que tira una promesa (falla si no tira).
export const statusDe = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
  } catch (error: any) {
    return typeof error?.getStatus === 'function' ? error.getStatus() : error;
  }
  throw new Error('Se esperaba un error');
};
