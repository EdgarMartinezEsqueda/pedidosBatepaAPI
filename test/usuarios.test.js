const sequelize = require("../config/database");
const supertest = require("supertest");
const { app, server } = require("../index");

const api = supertest(app);

let adminToken = "", testUserID = "";

// Log in as admin to get a token
beforeAll(async () => {
    const response = await api.post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
    });

    adminToken = response.body.data.accessToken;
});

describe("Usuarios", () => {
    // Register a test user
    it("Register a new test user", async () => {
        const response = await api.post("/auth/registro").send({
            username: "testuser",
            email: "testuser@example.com",
            password: "password123",
            confirmPassword: "password123",
        });
        testUserID = response.body.data.userId;
        await expect(response.statusCode).toBe(201);
        await expect(response.body);
    });
    
    // Test updating a user
    it("should fail to update a user (because it's not authorized)", async () => {
        const response = await api
            .patch(`/usuarios/${testUserID}`)
            .send({
                username: "updateduser",
            });
        expect(response.statusCode).toBe(401);
        expect(response.body.status);
    });
    
    // Test updating a user with invalid ID
    it("should fail to update a user with invalid ID", async () => {
        const response = await api
        .patch("/usuarios/invalid")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            username: "updateduser",
        });
        
        expect(response.statusCode).toBe(400);
        expect(response.body.error);
    });
    
    // Test updating a user with non-existent ID
    it("should fail to update a non-existent user", async () => {
        const response = await api
        .patch("/usuarios/999999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            username: "updateduser",
        });
        
        expect(response.statusCode).toBe(404);
        expect(response.body.error);
    });
    
    // Test updating a user
    it("should update a user", async () => {
        const response = await api
        .patch(`/usuarios/${testUserID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            username: "updateduser",
        });
        
        expect(response.statusCode).toBe(200);
        expect(response.body.status);
    });
    
    // Test fetching a non-existent user
    it("should fail to fetch a non-existent user", async () => {
        const response = await api
        .get("/usuarios/999999")
        .set("Authorization", `Bearer ${adminToken}`);
        
        expect(response.statusCode).toBe(404);
        expect(response.body.error);
    });
    
    // Test fetching a specific user
    it("should fetch a specific user", async () => {
        const response = await api
            .get(`/usuarios/${testUserID}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.status);
    });

    // Test fetching all users
    it("should fetch all users", async () => {
        const response = await api
            .get("/usuarios")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    // Test verifying a user
    it("should fail to verify a user", async () => {
        const response = await api
        .patch(`/usuarios/no/verificar`)
        .set("Authorization", `Bearer ${adminToken}`);
            
        expect(response.statusCode).toBe(400);
        expect(response.body.status);
    });
    
    // Test verifying a user
    it("should verify a user", async () => {
        const response = await api
        .patch(`/usuarios/${testUserID}/verificar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
                verificado: true,
            });
            
        expect(response.statusCode).toBe(200);
        expect(response.body.status);
    });
    
    // Test fetching pending users
    it("should fetch pending users", async () => {
        const response = await api
        .get("/usuarios/todos/pendientes")
        .set("Authorization", `Bearer ${adminToken}`);
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    // Test deleting a non-existent user
    it("should fail to delete a non-existent user", async () => {
        const response = await api
            .delete("/usuarios/999999")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.error);
    });

    // Test deleting a user
    it("should delete a user", async () => {
        const response = await api
            .delete(`/usuarios/${testUserID}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);
    });
});

// Close the database connection and server
afterAll(async () => { 
    await sequelize.close();
    server.close();
});