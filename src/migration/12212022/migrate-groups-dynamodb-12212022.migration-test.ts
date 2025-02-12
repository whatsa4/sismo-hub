/* eslint-disable no-restricted-imports */
import { testGroupsMigrationWithData } from "../migration-test-groups";
import { migrateGroupsProperties } from "./migrate-groups-dynamodb-12212022";
import { MemoryFileStore } from "infrastructure/file-store/memory-file-store";
import {
  createGroupsEntityManager,
  DyanmoDBGroupStore,
} from "infrastructure/group-store";
import { MemoryLogger } from "infrastructure/logger/memory-logger";
import { getLocalDocumentClient, resetDB } from "infrastructure/utils";

describe("Test migration", () => {
  const dynamodbClient = getLocalDocumentClient();
  const entityManager = createGroupsEntityManager({
    documentClient: dynamodbClient,
    prefix: "test-",
  });
  const dataFileStore = new MemoryFileStore("test");
  const groupStore = new DyanmoDBGroupStore(dataFileStore, entityManager);

  beforeEach(async () => {
    await resetDB(dynamodbClient);
    dataFileStore.reset();
    await groupStore.save(testGroupsMigrationWithData.group1_0);
    await groupStore.save(testGroupsMigrationWithData.group1_1);
    await groupStore.save(testGroupsMigrationWithData.group2_0);
    console.log("groups", await groupStore.latests());

    const groups = [
      ...(await groupStore.search({
        groupName: testGroupsMigrationWithData.group1_0.name,
      })),
      ...(await groupStore.search({
        groupName: testGroupsMigrationWithData.group2_0.name,
      })),
    ];
    console.log("groups", groups);
  });

  it("should migrate groups", async () => {
    await migrateGroupsProperties({
      dataFileStore,
      entityManager,
      loggerService: new MemoryLogger(),
    });

    const groups = [
      await groupStore.latest(testGroupsMigrationWithData.group1_0.name),
      await groupStore.latest(testGroupsMigrationWithData.group2_0.name),
    ];

    expect(groups.map((g) => g.properties)).toEqual([
      { tierDistribution: { "1": 4 }, accountsNumber: 4 },
      { tierDistribution: { "1": 3 }, accountsNumber: 3 },
    ]);
  });
});
