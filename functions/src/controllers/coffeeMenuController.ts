import { functions, getCors, REGION, errorResponse } from "./orchestrator/shared";
import { CoffeeMenuService } from "../services/coffeeMenuService";

const service = new CoffeeMenuService();

export const getCoffeeMenus = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const menus = await service.getAll();
        response.json({ success: true, menus });
      } catch (error) {
        errorResponse(response, error, "getCoffeeMenus");
      }
    });
  });

export const createCoffeeMenu = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const { name, categories } = request.body;
        if (!name || !categories) {
          response.status(400).json({ success: false, error: "name ve categories gerekli" });
          return;
        }
        const menu = await service.create({ name, categories });
        response.status(201).json({ success: true, menu });
      } catch (error) {
        errorResponse(response, error, "createCoffeeMenu");
      }
    });
  });

export const updateCoffeeMenu = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use PUT" });
          return;
        }
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "ID gerekli" });
          return;
        }
        const { name, categories } = request.body;
        await service.update(id, { name, categories });
        response.json({ success: true });
      } catch (error) {
        errorResponse(response, error, "updateCoffeeMenu");
      }
    });
  });

export const deleteCoffeeMenu = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE") {
          response.status(405).json({ success: false, error: "Use DELETE" });
          return;
        }
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "ID gerekli" });
          return;
        }
        await service.delete(id);
        response.json({ success: true });
      } catch (error) {
        errorResponse(response, error, "deleteCoffeeMenu");
      }
    });
  });
