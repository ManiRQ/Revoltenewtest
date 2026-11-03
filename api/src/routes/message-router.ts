import { Router } from "express";
import { sendError, sendSuccess } from "../http.js";
import { listTicketMessages } from "../services/ticket-service.js";
import { messageListQuerySchema } from "../validators.js";

export const messageRouter = Router();

messageRouter.get("/tickets/:ticketId/messages", (req, res) => {
  const query = messageListQuerySchema.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "INVALID_FILTER", "Conversation page options are not valid.");
    return;
  }

  const result = listTicketMessages(
    req.params.ticketId,
    query.data.page,
    query.data.pageSize,
  );
  if (!result) {
    sendError(res, 404, "TICKET_NOT_FOUND", "This ticket could not be found.");
    return;
  }
  sendSuccess(res, result);
});
