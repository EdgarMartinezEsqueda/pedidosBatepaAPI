const sequelize = require("../config/database");
const supertest = require("supertest");
const { app, server } = require("../index");

const api = supertest(app);

describe("Register", () => {
    it.skip("Register a new user", async () => {
        const response = await api.post("/auth/registro").send({
            username: "admin",
            email: "test@example.com",
            password: "password123",
            confirmPassword: "password123",
        });
        await expect(response.statusCode).toBe(201);
        await expect(response.body);
    });

    it("Register a new user with missing fields", async () => {
        const response = await api.post("/auth/registro").send({
            username: "test",
            email: "testu@example.com",
            password: "XXXXXXXXXXX",
        });
        await expect(response.statusCode).toBe(422);
        await expect(response.body.error);
    });

    it("Register a new user with short password", async () => {
        const response = await api.post("/auth/registro").send({
            username: "test",
            email: "testu@example.com",
            password: "123",
            confirmPassword: "123",
        });
        await expect(response.statusCode).toBe(400);
        await expect(response.body.error);
    });

    it("Register a new user with different passwords", async () => {
        const response = await api.post("/auth/registro").send({
            username: "XXXXXXXX",
            email: "testu@example.com",
            password: "1234567",
            confirmPassword: "12345678",
        });
        await expect(response.statusCode).toBe(400);
        await expect(response.body.error);
    });

    it("Register a new user with existing email", async () => {
        const response = await api.post("/auth/registro").send({
            username: "test",
            email: "test@example.com",
            password: "password123",
            confirmPassword: "password123",
        });
        await expect(response.statusCode).toBe(422);
        await expect(response.body.error);
    });
});

describe("Login", () => {
    it("Login with valid credentials", async () => {
        const response = await api.post("/auth/login").send({
            email: "test@example.com",
            password: "password123",
        });
        
        await expect(response.statusCode).toBe(200);
        await expect(response.body);
    });

    it("Login with invalid credentials (password)", async () => {
        const response = await api.post("/auth/login").send({
            email: "test@example.com",
            password: "XXXXXXXXXXX",
        });
        await expect(response.statusCode).toBe(422);
        await expect(response.body.error);
    });

    it("Login with invalid credentials (email)", async () => {
        const response = await api.post("/auth/login").send({
            email: "test1@example.com",
            password: "password123",
        });
        await expect(response.statusCode).toBe(422);
        await expect(response.body.error);
    });

    it.skip("Unverified user", async () => {
        const response = await api.post("/auth/login").send({
            email: "test@example.com",
            password: "password123",
        });
        await expect(response.statusCode).toBe(403);
        await expect(response.body.error);
    });
});

afterAll(() => {
    sequelize.close();
    server.close();
});