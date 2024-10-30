import { redisGet, redisHealth, redisSet, redisTotalConnections } from "./redis";

describe("redis", () => {
  it("should ping", async () => {
    const response = await redisHealth();
    expect(response).toBe(true);
  });

  

  it("should set redis key value", async () => {
    const key = "test-key";
    const value = "test-value";
    const result = await redisSet(key, value);
    expect(result).toBe("OK");
  });

  it("should get redis key value", async () => {
    const key = "test-key";
    const value = await redisGet(key);
    expect(value).toBe("test-value")
  })

  it("should return total redis connections", async () => {
    const connections = await redisTotalConnections();
    expect(connections).toEqual(1);
  });

});
