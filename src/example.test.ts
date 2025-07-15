import { Entity, MikroORM, PrimaryKey, Property } from '@mikro-orm/sqlite';

@Entity()
class User {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property()
  someField!: string

  @Property({ nullable: true, default: null })
  someNullableField!: string | null; // It's should be not required, but it is. Why is it necessary?
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

const getLastEntity = async () => {
  const allEntities = await orm.em.findAll(User);
  return allEntities[allEntities.length - 1]
}

// ! In all tests i only check the creation of new entities using the upsert method

// This test shows that creating an entity with *all field* works
test('OK - creating an entity (with all fields)', async () => {
  // Creating an entity (please note that i'm not specifying a unique field id, and the entity is created as i expect)
  const firstCreatedEntity = await orm.em.upsert(User, {
    someField: 'random-str',
    someNullableField: 'random-str' // <- entity *will created*
  });
  await orm.em.persistAndFlush(firstCreatedEntity);
  
  // firstCreatedEntity.id should be equal to the last entity id in DB
  const lastEntityInDb = await getLastEntity()
  console.log('!!! First created entity:', firstCreatedEntity);
  expect(firstCreatedEntity.id).toBe(lastEntityInDb.id);
});

// This test shows that creating an entity *without someNullableField* does'nt work
test('FAIL - creating an entity (without someNullableField field)', async () => {
  // Creating an entity
  const secondCreatedEntity = await orm.em.upsert(User, {
    someField: 'random-str-2',
    // someNullableField: 'why is it necessary?' // <- entity *will not created* (i don't know why, but in the reproduction i can't create an entity the same way i do in my NestJS + PostgreSQL project. In my project i can specify only someField, and the entity will be created, but it will return the wrong id)
  });
  await orm.em.persistAndFlush(secondCreatedEntity);
  
  // secondCreatedEntity.id should be equal to the last entity id in DB
  // ! if I were able to create the entity (see comment in line 58), *the test would still fail* because secondCreatedEntity.id would be always equal to 1 (probably first entity in DB)
  const lastEntityInDb = await getLastEntity()
  console.log('!!! Second created entity:', secondCreatedEntity);
  expect(secondCreatedEntity.id).toBe(lastEntityInDb.id);
});
