const sequelize = require("../config/database");
const supertest = require("supertest");
const { app, server } = require("../index");

const api = supertest(app);

let adminToken = "", testRouteID = "", testCommunityID = "";
const testMunicipio = "Ciudad de Prueba";

beforeAll(async () => {
    // Login como admin
    const loginResponse = await api.post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
    });
    adminToken = loginResponse.body.data.accessToken;

    // Crear ruta de prueba
    const routeResponse = await api
        .post("/rutas")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ nombre: "Ruta para Comunidades" });
    testRouteID = routeResponse.body.data.id;
});

describe("Comunidades", () => {
    // Crear comunidad
    it("debería crear una nueva comunidad", async () => {
        const response = await api
            .post("/comunidades")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "Comunidad de Prueba",
                idRuta: testRouteID,
                municipio: testMunicipio,
                jefa: "Líder de Prueba",
                contacto: "contacto@test.com",
                direccion: "Dirección de Prueba"
            });

        testCommunityID = response.body.data.id;

        expect(response.statusCode).toBe(201);
        expect(response.body.data).toHaveProperty("id");
    });

    // Validación de campos requeridos
    it("debería fallar si faltan campos requeridos", async () => {
        const tests = [
            { nombre: "Falta idRuta", municipio: testMunicipio },
            { idRuta: testRouteID, municipio: testMunicipio },
            { nombre: "Falta municipio", idRuta: testRouteID }
        ];

        for (const body of tests) {
            const response = await api
                .post("/comunidades")
                .set("Authorization", `Bearer ${adminToken}`)
                .send(body);
            
            expect(response.statusCode).toBe(400);
        }
    });

    // Obtener todas las comunidades
    it("debería obtener todas las comunidades paginadas", async () => {
        const response = await api
            .get("/comunidades?page=1&limit=10")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.data).toBeInstanceOf(Array);
    });

    // Obtener comunidades por ciudad
    it("debería obtener comunidades por municipio", async () => {
        const response = await api
            .get(`/comunidades/ciudad/${testMunicipio}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.data.some(c => c.municipio === testMunicipio)).toBe(true);
    });

    // Obtener una comunidad específica
    it("debería obtener una comunidad por ID", async () => {
        const response = await api
            .get(`/comunidades/${testCommunityID}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.data.id).toBe(testCommunityID);
    });

    // Actualizar una comunidad
    it("debería actualizar una comunidad", async () => {
        const response = await api
            .patch(`/comunidades/${testCommunityID}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ nombre: "Nombre Actualizado" });

        expect(response.statusCode).toBe(200);
    });

    // Eliminar una comunidad
    it("debería eliminar una comunidad", async () => {
        const response = await api
            .delete(`/comunidades/${testCommunityID}`)
            .set("Authorization", `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(204);
    });

    describe("Manejo de errores", () => {
        it("debería fallar con ID inválido", async () => {
            // const tests = [
            //     api.get("/comunidades/invalid"),
            //     api.patch("/comunidades/invalid"),
            //     api.delete("/comunidades/invalid")
            // ];

            // for (const test of tests) {
            //     const response = await test.set("Authorization", `Bearer ${adminToken}`).send();
            //     expect(response.statusCode).toBe(400);
            // }
            const response = await api
            .get(`/comunidades/invalid`)
            .set("Authorization", `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(400);
        });

        it("debería fallar con ID inexistente", async () => {
            // const tests = [
            //     api.get("/comunidades/999999"),
            //     api.patch("/comunidades/999999"),
            //     api.delete("/comunidades/999999")
            // ];
            // for (const test of tests) {
            //     const response = await test.set("Authorization", `Bearer ${adminToken}`).send();
            //     expect(response.statusCode).toBe(404);
            // }
            const response = await api
            .get(`/comunidades/999999`)
            .set("Authorization", `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(404);
        });
    });
});

afterAll(async () => {
    await new Promise((resolve) => server.close(resolve)); // Primero cierra el servidor
    await sequelize.close(); // Luego la DB
});