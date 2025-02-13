const sequelize = require("../config/database");
const supertest = require("supertest");
const { app, server } = require("../index");

const api = supertest(app);

let adminToken = "", testRouteID = "";

// Log in as admin to get a token
beforeAll(async () => {
    const response = await api.post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
    });

    adminToken = response.body.data.accessToken;
});

describe("Rutas", () => {
    // Test creating a new route
    it("should create a new route", async () => {
        const response = await api
            .post("/rutas")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "Test Route",
            });

        testRouteID = response.body.data.id; // Save the route ID for later tests

        expect(response.statusCode).toBe(201);
        expect(response.body.data).toHaveProperty("id");
        expect(response.body.data.nombre).toBe("Test Route");
    });

    // Test creating a route with missing fields
    it("should fail to create a route with missing fields", async () => {
        const response = await api
            .post("/rutas")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing or invalid fields");
    });

    // Test fetching all routes
    it("should fetch all routes", async () => {
        const response = await api
            .get("/rutas")
            .set("Authorization", `Bearer ${adminToken}`);
            
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    // Test fetching a specific route
    it("should fetch a specific route", async () => {
        const response = await api
            .get(`/rutas/${testRouteID}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.data.id).toBe(testRouteID);
        expect(response.body.data.nombre).toBe("Test Route");
    });

    // Test fetching a non-existent route
    it("should fail to fetch a non-existent route", async () => {
        const response = await api
            .get("/rutas/999999")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.error.message).toBe("Route not found");
    });

    // Test updating a route
    it("should update a route", async () => {
        const response = await api
            .patch(`/rutas/${testRouteID}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "Updated Route Name",
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.message).toBe("Route updated");
    });

    // Test updating a route with invalid ID
    it("should fail to update a route with invalid ID", async () => {
        const response = await api
            .patch("/rutas/invalid")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "Updated Route Name",
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid ID");
    });

    // Test updating a non-existent route
    it("should fail to update a non-existent route", async () => {
        const response = await api
            .patch("/rutas/999999")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "Updated Route Name",
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.error.message).toBe("Route not found");
    });

    // Test deleting a route
    it("should delete a route", async () => {
        const response = await api
            .delete(`/rutas/${testRouteID}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);
    });

    // Test deleting a non-existent route
    it("should fail to delete a non-existent route", async () => {
        const response = await api
            .delete("/rutas/999999")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.error.message).toBe("Route not found");
    });

    // Test deleting a route with invalid ID
    it("should fail to delete a route with invalid ID", async () => {
        const response = await api
            .delete("/rutas/invalid")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid ID");
    });
});

// Clean up the database after all tests
afterAll(async () => {
    await sequelize.close();
    server.close();
});
