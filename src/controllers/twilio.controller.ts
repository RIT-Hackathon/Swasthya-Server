import { Request, Response } from "express";

export const respondToQuery = (req: Request, res: Response) => {
  const message = req.body.Body;
  const from = req.body.From;

  console.log("📨 Received message:", message, "from:", from);

  res.send(
    `<Response><Message>Thanks for your message: ${message}</Message></Response>`
  );
};
