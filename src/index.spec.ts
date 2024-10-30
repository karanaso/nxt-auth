
describe("service", () => { 

  it("should fetch /", async () => {
    const response = await fetch("http://localhost:3000");
    expect(response.status).toBe(200);
  });

  describe("users", () => {
    const email = `test-${Math.random() * 999999}@test.com`;
    const password = `password-${Math.random() * 999999}`;

    describe("/signup", () => {
      it("should fail /signup because email is not set", async () => {
        const response = await fetch("http://localhost:3000/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.message).toBe("Email is required");
      });

      it("should fail /signup because password is not set", async () => {
        const response = await fetch("http://localhost:3000/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: "t" }),
        });
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.message).toBe("Password is required");
      });

      it("should pass /signup", async () => {
        const response = await fetch("http://localhost:3000/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.message).toBe("User created");
      });
    });

    describe("/signin", () => {
      it("should fail /signin because email is not set", async () => {
        const response = await fetch("http://localhost:3000/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe("Email is required");
      });

      it("should fail /signin because email is not set", async () => {
        const response = await fetch("http://localhost:3000/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: 'test@test.com',
          }),
        });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe("Password is required");
      });

      it("should fail /signin because email does not exist", async () => {
        const response = await fetch("http://localhost:3000/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: `non-existent-account-${Math.random()}@test.com`,
            password: "password",
          }),
        });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe("User does not exist");
      });

      it("should fail /signin because password is incorrect", async () => {
        const response = await fetch("http://localhost:3000/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password: "password",
          }),
        });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe("Password is incorrect");
      });

      it("should pass /signin ", async () => {
        const response = await fetch("http://localhost:3000/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe("User logged in");
        expect(data.token).toBeDefined();
      });
    });

    describe('/refresh-token', () => {
      it('should not refresh the token because the token is not set', async () => {
        const response = await fetch("http://localhost:3000/refresh-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe("Token is required");
      });

      it('should not refresh the token because the token is INVALID', async () => {
        const response = await fetch("http://localhost:3000/refresh-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: 'invalid-token',
          })
        });
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe("Invalid token");
      });

      it('should refresh the token', async () => {
          const response = await fetch("http://localhost:3000/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe("User logged in");
        expect(data.token).toBeDefined();

        const refreshResponse = await fetch("http://localhost:3000/refresh-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: data.token,
          }),
        });

        expect(refreshResponse.status).toBe(200);
        const refreshData = await refreshResponse.json();
        expect(refreshData.message).toBe("Token refreshed successfully");
        expect(refreshData.token).toBeDefined();
      });
    });
  });
});
